from __future__ import annotations

import logging
from typing import Any

from celery import Celery
from celery.schedules import crontab
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.config import get_settings
from app.database import SessionLocal
from app.models.db_models import CompanyProfile, TenderNotice
from app.services.boamp_client import BoampClient
from app.services.llm_analyzer import LlmAnalyzer

logger = logging.getLogger(__name__)
settings = get_settings()

celery_app = Celery(
    "french_tender_worker",
    broker=settings.redis_url,
    backend=settings.redis_url,
)

celery_app.conf.update(
    timezone="UTC",
    enable_utc=True,
    task_serializer="json",
    result_serializer="json",
    accept_content=["json"],
    beat_schedule={
        "daily-boamp-veille": {
            "task": "app.worker.poll_boamp_tenders",
            "schedule": crontab(
                hour=settings.boamp_cron_hour,
                minute=settings.boamp_cron_minute,
            ),
            "args": (settings.boamp_default_limit,),
        }
    },
)


def get_or_create_company_profile(db: Session) -> CompanyProfile:
    profile = db.execute(select(CompanyProfile).limit(1)).scalar_one_or_none()
    if profile is not None:
        return profile

    profile = CompanyProfile(
        name=settings.default_company_name,
        description="Entreprise spécialisée en services numériques, ingénierie et déploiement.",
        capabilities=["Conseil", "Intégration", "Exploitation & TMA", "Support N1/N2/N3"],
        certifications=["ISO 9001", "ISO 27001"],
        target_cpv_codes=[c.strip() for c in settings.default_cpv_codes.split(",") if c.strip()],
        target_departments=[d.strip() for d in settings.default_departments.split(",") if d.strip()],
        target_keywords=[k.strip() for k in settings.default_keywords.split(",") if k.strip()],
        procedure_types=[],
        min_days_remaining=5,
    )
    db.add(profile)
    db.commit()
    db.refresh(profile)
    return profile


def sync_boamp_to_db(db: Session, limit: int = 25) -> dict[str, Any]:
    """Fetch matching BOAMP notices, score Go/No-Go, and upsert into PostgreSQL."""
    profile = get_or_create_company_profile(db)
    client = BoampClient()
    analyzer = LlmAnalyzer()

    records = client.fetch_tenders(
        departments=profile.target_departments,
        cpv_codes=profile.target_cpv_codes,
        keywords=profile.target_keywords,
        procedure_types=profile.procedure_types,
        limit=limit,
    )

    inserted = 0
    updated = 0
    for rec in records:
        score, summary = analyzer.score_tender_go_no_go(profile, rec)
        existing = db.execute(
            select(TenderNotice).where(TenderNotice.boamp_id == rec["boamp_id"])
        ).scalar_one_or_none()

        if existing:
            existing.title = rec["title"]
            existing.buyer_name = rec["buyer_name"]
            existing.department = rec["department"]
            existing.cpv_codes = rec["cpv_codes"]
            existing.procedure_type = rec["procedure_type"]
            existing.publication_date = rec["publication_date"]
            existing.deadline_date = rec["deadline_date"]
            existing.boamp_url = rec["boamp_url"]
            existing.description = rec["description"]
            existing.raw_payload = rec["raw_payload"]
            existing.attribution = rec["attribution"]
            existing.go_no_go_score = score
            existing.go_no_go_summary = summary
            updated += 1
        else:
            db.add(
                TenderNotice(
                    boamp_id=rec["boamp_id"],
                    title=rec["title"],
                    buyer_name=rec["buyer_name"],
                    department=rec["department"],
                    cpv_codes=rec["cpv_codes"],
                    procedure_type=rec["procedure_type"],
                    publication_date=rec["publication_date"],
                    deadline_date=rec["deadline_date"],
                    boamp_url=rec["boamp_url"],
                    description=rec["description"],
                    raw_payload=rec["raw_payload"],
                    attribution=rec["attribution"],
                    go_no_go_score=score,
                    go_no_go_summary=summary,
                    status="new",
                )
            )
            inserted += 1

    db.commit()
    return {"fetched": len(records), "inserted": inserted, "updated": updated}


@celery_app.task(name="app.worker.poll_boamp_tenders")
def poll_boamp_tenders(limit: int = 25) -> dict[str, Any]:
    """Scheduled Celery task for automated BOAMP veille."""
    db = SessionLocal()
    try:
        result = sync_boamp_to_db(db, limit=limit)
        logger.info("BOAMP polling finished: %s", result)
        return result
    except Exception as exc:
        logger.exception("BOAMP polling task failed: %s", exc)
        return {"error": str(exc)}
    finally:
        db.close()
