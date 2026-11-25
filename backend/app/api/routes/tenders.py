from __future__ import annotations

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import case, desc, or_, select
from sqlalchemy.orm import Session

from app.auth import require_auth
from app.database import get_db
from app.models.db_models import CompanyProfile, TenderNotice
from app.schemas import (
    BulkMarkSeenRequest,
    CompanyProfileSchema,
    SyncTendersRequest,
    TenderNoticeOut,
    TenderStatusUpdate,
)
from app.worker import (
    get_or_create_company_profile,
    poll_boamp_tenders,
    rescore_existing_tenders,
    sync_boamp_to_db,
)

router = APIRouter(tags=["tenders"], dependencies=[Depends(require_auth)])

ALLOWED_STATUSES = {"new", "shortlisted", "in_progress", "seen", "archived", "rejected"}


def _profile_to_schema(profile: CompanyProfile) -> CompanyProfileSchema:
    return CompanyProfileSchema(
        id=profile.id,
        name=profile.name,
        president=profile.president,
        siren=profile.siren,
        siret=profile.siret,
        tva_number=profile.tva_number,
        naf_code=profile.naf_code,
        address=profile.address,
        description=profile.description,
        capabilities=profile.capabilities,
        certifications=profile.certifications,
        target_cpv_codes=profile.target_cpv_codes,
        target_departments=profile.target_departments,
        target_keywords=profile.target_keywords,
        procedure_types=profile.procedure_types,
        min_days_remaining=profile.min_days_remaining,
        min_target_amount=profile.min_target_amount,
        max_target_amount=profile.max_target_amount,
        include_all_france=profile.include_all_france,
        include_eu=profile.include_eu,
        min_suitability_score=profile.min_suitability_score,
    )


def _notice_to_out(notice: TenderNotice) -> TenderNoticeOut:
    days_remaining: int | None = None
    if notice.deadline_date:
        dl = notice.deadline_date
        if dl.tzinfo is None:
            dl = dl.replace(tzinfo=timezone.utc)
        days_remaining = (dl - datetime.now(timezone.utc)).days

    return TenderNoticeOut(
        id=notice.id,
        boamp_id=notice.boamp_id,
        source=notice.source,
        region=notice.region,
        country=notice.country,
        title=notice.title,
        buyer_name=notice.buyer_name,
        department=notice.department,
        cpv_codes=notice.cpv_codes,
        procedure_type=notice.procedure_type,
        publication_date=notice.publication_date,
        deadline_date=notice.deadline_date,
        days_remaining=days_remaining,
        estimated_amount=notice.estimated_amount,
        currency=notice.currency,
        boamp_url=notice.boamp_url,
        description=notice.description,
        attribution=notice.attribution,
        go_no_go_score=notice.go_no_go_score,
        go_no_go_summary=notice.go_no_go_summary,
        status=notice.status,
        created_at=notice.created_at,
    )


@router.get("/profile", response_model=CompanyProfileSchema)
def get_company_profile(db: Session = Depends(get_db)) -> CompanyProfileSchema:
    profile = get_or_create_company_profile(db)
    return _profile_to_schema(profile)


@router.put("/profile", response_model=CompanyProfileSchema)
def update_company_profile(
    payload: CompanyProfileSchema,
    db: Session = Depends(get_db),
) -> CompanyProfileSchema:
    profile = get_or_create_company_profile(db)
    profile.name = payload.name
    profile.president = payload.president
    profile.siren = payload.siren
    profile.siret = payload.siret
    profile.tva_number = payload.tva_number
    profile.naf_code = payload.naf_code
    profile.address = payload.address
    profile.description = payload.description
    profile.capabilities = payload.capabilities
    profile.certifications = payload.certifications
    profile.target_cpv_codes = payload.target_cpv_codes
    profile.target_departments = payload.target_departments
    profile.target_keywords = payload.target_keywords
    profile.procedure_types = payload.procedure_types
    profile.min_days_remaining = payload.min_days_remaining
    profile.min_target_amount = payload.min_target_amount
    profile.max_target_amount = payload.max_target_amount
    profile.include_all_france = payload.include_all_france
    profile.include_eu = payload.include_eu
    profile.min_suitability_score = payload.min_suitability_score
    db.commit()
    db.refresh(profile)
    rescore_existing_tenders(db)
    return _profile_to_schema(profile)


@router.get("/tenders", response_model=list[TenderNoticeOut])
def list_tenders(
    region: str | None = Query(default=None, description="FR or EU"),
    source: str | None = Query(default=None, description="BOAMP or TED"),
    status: str | None = Query(default=None),
    department: str | None = Query(default=None),
    min_score: int | None = Query(default=None, ge=0, le=100),
    only_relevant: bool = Query(default=True),
    only_open: bool = Query(default=True),
    limit: int = Query(default=100, ge=1, le=500),
    db: Session = Depends(get_db),
) -> list[TenderNoticeOut]:
    profile = get_or_create_company_profile(db)
    effective_min_score = (
        min_score
        if min_score is not None
        else (profile.min_suitability_score if only_relevant else 0)
    )

    # Order France (FR) first, then EU, then highest suitability, then soonest deadline
    region_order = case((TenderNotice.region == "FR", 0), else_=1)
    stmt = select(TenderNotice).order_by(
        region_order.asc(),
        desc(TenderNotice.go_no_go_score),
        TenderNotice.deadline_date.asc().nulls_last(),
        desc(TenderNotice.publication_date),
    )

    if region:
        stmt = stmt.where(TenderNotice.region == region.upper())
    if source:
        stmt = stmt.where(TenderNotice.source == source.upper())
    if status:
        stmt = stmt.where(TenderNotice.status == status)
    else:
        stmt = stmt.where(TenderNotice.status != "archived")
    if department:
        stmt = stmt.where(TenderNotice.department == department)
    if effective_min_score > 0:
        stmt = stmt.where(TenderNotice.go_no_go_score >= effective_min_score)
    if only_open:
        now = datetime.now(timezone.utc)
        stmt = stmt.where(
            or_(TenderNotice.deadline_date >= now, TenderNotice.deadline_date.is_(None))
        )

    stmt = stmt.limit(limit)
    notices = list(db.execute(stmt).scalars().all())
    return [_notice_to_out(n) for n in notices]


@router.post("/tenders/sync")
def trigger_boamp_sync(
    payload: SyncTendersRequest,
    db: Session = Depends(get_db),
) -> dict:
    if payload.async_mode:
        task = poll_boamp_tenders.delay(payload.limit, payload.eu_limit)
        return {"queued": True, "task_id": task.id}
    try:
        stats = sync_boamp_to_db(
            db,
            limit=payload.limit,
            eu_limit=payload.eu_limit,
            include_eu=payload.include_eu,
        )
        return {"queued": False, **stats}
    except Exception as exc:
        raise HTTPException(
            status_code=502,
            detail=f"Échec de synchronisation FR/UE : {exc}",
        ) from exc


@router.post("/tenders/mark-seen")
def bulk_mark_tenders_seen(
    payload: BulkMarkSeenRequest,
    db: Session = Depends(get_db),
) -> dict:
    if not payload.tender_ids:
        return {"updated": 0}
    notices = list(
        db.execute(
            select(TenderNotice).where(
                TenderNotice.id.in_(payload.tender_ids),
                TenderNotice.status == "new",
            )
        )
        .scalars()
        .all()
    )
    for n in notices:
        n.status = "seen"
    db.commit()
    return {"updated": len(notices)}


@router.patch("/tenders/{tender_id}", response_model=TenderNoticeOut)
def update_tender_status(
    tender_id: int,
    payload: TenderStatusUpdate,
    db: Session = Depends(get_db),
) -> TenderNoticeOut:
    if payload.status not in ALLOWED_STATUSES:
        raise HTTPException(status_code=400, detail=f"Invalid status: {payload.status}")
    tender = db.get(TenderNotice, tender_id)
    if not tender:
        raise HTTPException(status_code=404, detail="Tender not found")
    tender.status = payload.status
    db.commit()
    db.refresh(tender)
    return _notice_to_out(tender)
