from __future__ import annotations

import logging
from datetime import datetime, timezone
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
from app.services.ted_client import TedClient

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
        president=settings.default_company_president,
        siren=settings.default_company_siren,
        siret=settings.default_company_siret,
        tva_number=settings.default_company_tva,
        naf_code=settings.default_company_naf,
        address=settings.default_company_address,
        description=(
            "TRADISTER SASU (Tradister-Managed IT Services), présidée par Bisma Kashif, "
            "est une société française de conseil en systèmes et logiciels informatiques (NAF 62.02A) "
            "basée à Ris-Orangis (91). Spécialisée en infogérance MSP, support N1/N2/N3, "
            "administration cloud, cybersécurité, ITSM et développement/maintenance applicative."
        ),
        capabilities=[
            "Infogérance & Services Managés IT (MSP)",
            "Support utilisateur & Helpdesk N1/N2/N3 (ITSM)",
            "Conseil en systèmes et logiciels informatiques",
            "Administration Cloud, Microsoft 365 & Infrastructure",
            "Cybersécurité, Protection Endpoints (EDR) & Sauvegarde/PRA",
            "Développement logiciel, intégration API & automatisation",
            "Maintenance applicative (TMA / MCO)",
        ],
        certifications=[
            "SASU active immatriculée en France (SIREN 988 318 945)",
            "Code NAF/APE 62.02A — Conseil en systèmes et logiciels informatiques",
        ],
        target_cpv_codes=[c.strip() for c in settings.default_cpv_codes.split(",") if c.strip()],
        target_departments=[d.strip() for d in settings.default_departments.split(",") if d.strip()],
        target_keywords=[k.strip() for k in settings.default_keywords.split(",") if k.strip()],
        procedure_types=[],
        min_days_remaining=5,
        min_target_amount=float(settings.default_min_target_amount),
        max_target_amount=float(settings.default_max_target_amount),
        include_all_france=True,
        include_eu=True,
        min_suitability_score=50,
    )
    db.add(profile)
    db.commit()
    db.refresh(profile)
    return profile


def _upsert_tender_records(
    db: Session,
    profile: CompanyProfile,
    records: list[dict[str, Any]],
    analyzer: LlmAnalyzer,
) -> tuple[int, int, int]:
    """Score, filter by relevance, and upsert tender notices into PostgreSQL."""
    inserted = 0
    updated = 0
    filtered_out = 0
    now = datetime.now(timezone.utc)
    min_score = profile.min_suitability_score or 50

    for rec in records:
        deadline = rec.get("deadline_date")
        if isinstance(deadline, datetime) and deadline < now:
            filtered_out += 1
            continue

        if not analyzer.is_relevant_to_profile(profile, rec):
            filtered_out += 1
            continue

        score, summary = analyzer.score_tender_go_no_go(profile, rec, use_llm=False)
        if score < min_score:
            filtered_out += 1
            continue

        existing = db.execute(
            select(TenderNotice).where(TenderNotice.boamp_id == rec["boamp_id"])
        ).scalar_one_or_none()

        if existing:
            existing.source = rec.get("source", "BOAMP")
            existing.region = rec.get("region", "FR")
            existing.country = rec.get("country", "FRA")
            existing.title = rec["title"]
            existing.buyer_name = rec["buyer_name"]
            existing.department = rec["department"]
            existing.cpv_codes = rec["cpv_codes"]
            existing.procedure_type = rec["procedure_type"]
            existing.publication_date = rec["publication_date"]
            existing.deadline_date = rec["deadline_date"]
            existing.estimated_amount = rec.get("estimated_amount")
            existing.currency = rec.get("currency", "EUR")
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
                    source=rec.get("source", "BOAMP"),
                    region=rec.get("region", "FR"),
                    country=rec.get("country", "FRA"),
                    title=rec["title"],
                    buyer_name=rec["buyer_name"],
                    department=rec["department"],
                    cpv_codes=rec["cpv_codes"],
                    procedure_type=rec["procedure_type"],
                    publication_date=rec["publication_date"],
                    deadline_date=rec["deadline_date"],
                    estimated_amount=rec.get("estimated_amount"),
                    currency=rec.get("currency", "EUR"),
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

    return inserted, updated, filtered_out


def rescore_existing_tenders(db: Session) -> int:
    """Recompute suitability scores for all existing notices after a profile update."""
    profile = get_or_create_company_profile(db)
    analyzer = LlmAnalyzer()
    notices = list(db.execute(select(TenderNotice)).scalars().all())
    for notice in notices:
        rec = {
            "source": notice.source,
            "region": notice.region,
            "country": notice.country,
            "title": notice.title,
            "buyer_name": notice.buyer_name,
            "department": notice.department,
            "cpv_codes": notice.cpv_codes,
            "procedure_type": notice.procedure_type,
            "publication_date": notice.publication_date,
            "deadline_date": notice.deadline_date,
            "estimated_amount": notice.estimated_amount,
            "currency": notice.currency,
            "description": notice.description,
        }
        score, summary = analyzer.score_tender_go_no_go(profile, rec, use_llm=False)
        notice.go_no_go_score = score
        notice.go_no_go_summary = summary
    db.commit()
    return len(notices)


def sync_boamp_to_db(
    db: Session,
    limit: int = 30,
    eu_limit: int = 25,
    include_eu: bool = True,
) -> dict[str, Any]:
    """Fetch matching France (BOAMP + TED FR) and EU (TED) notices, score suitability, and upsert."""
    profile = get_or_create_company_profile(db)
    boamp_client = BoampClient()
    ted_client = TedClient()
    analyzer = LlmAnalyzer()

    fr_records = boamp_client.fetch_tenders(
        departments=profile.target_departments,
        cpv_codes=profile.target_cpv_codes,
        keywords=profile.target_keywords,
        procedure_types=profile.procedure_types,
        limit=limit,
        include_all_france=profile.include_all_france,
    )

    eu_records: list[dict[str, Any]] = []
    ted_fr_records: list[dict[str, Any]] = []
    if include_eu and profile.include_eu and eu_limit > 0:
        try:
            ted_fr_records = ted_client.fetch_tenders(
                cpv_codes=profile.target_cpv_codes,
                limit=min(15, eu_limit),
                country_filter="FRA",
            )
            eu_records = ted_client.fetch_tenders(
                cpv_codes=profile.target_cpv_codes,
                limit=eu_limit,
                country_filter="EU_NON_FR",
            )
        except Exception as exc:
            logger.warning("TED EU sync partially failed: %s", exc)

    all_records = fr_records + ted_fr_records + eu_records
    inserted, updated, filtered_out = _upsert_tender_records(db, profile, all_records, analyzer)
    db.commit()

    return {
        "fetched": len(all_records),
        "fr_fetched": len(fr_records) + len(ted_fr_records),
        "eu_fetched": len(eu_records),
        "inserted": inserted,
        "updated": updated,
        "filtered_out": filtered_out,
    }


@celery_app.task(name="app.worker.poll_boamp_tenders")
def poll_boamp_tenders(limit: int = 30, eu_limit: int = 25) -> dict[str, Any]:
    """Scheduled Celery task for automated France (BOAMP) + EU (TED) veille."""
    db = SessionLocal()
    try:
        result = sync_boamp_to_db(db, limit=limit, eu_limit=eu_limit, include_eu=True)
        logger.info("FR/EU tender polling finished: %s", result)
        return result
    except Exception as exc:
        logger.exception("Tender polling task failed: %s", exc)
        return {"error": str(exc)}
    finally:
        db.close()
