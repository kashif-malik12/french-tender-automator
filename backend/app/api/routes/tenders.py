from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import desc, select
from sqlalchemy.orm import Session

from app.auth import require_auth
from app.database import get_db
from app.models.db_models import TenderNotice
from app.schemas import (
    CompanyProfileSchema,
    SyncTendersRequest,
    TenderNoticeOut,
    TenderStatusUpdate,
)
from app.worker import get_or_create_company_profile, poll_boamp_tenders, sync_boamp_to_db

router = APIRouter(tags=["tenders"], dependencies=[Depends(require_auth)])

ALLOWED_STATUSES = {"new", "shortlisted", "in_progress", "archived", "rejected"}


@router.get("/profile", response_model=CompanyProfileSchema)
def get_company_profile(db: Session = Depends(get_db)) -> CompanyProfileSchema:
    profile = get_or_create_company_profile(db)
    return CompanyProfileSchema(
        id=profile.id,
        name=profile.name,
        siret=profile.siret,
        description=profile.description,
        capabilities=profile.capabilities,
        certifications=profile.certifications,
        target_cpv_codes=profile.target_cpv_codes,
        target_departments=profile.target_departments,
        target_keywords=profile.target_keywords,
        procedure_types=profile.procedure_types,
        min_days_remaining=profile.min_days_remaining,
    )


@router.put("/profile", response_model=CompanyProfileSchema)
def update_company_profile(
    payload: CompanyProfileSchema,
    db: Session = Depends(get_db),
) -> CompanyProfileSchema:
    profile = get_or_create_company_profile(db)
    profile.name = payload.name
    profile.siret = payload.siret
    profile.description = payload.description
    profile.capabilities = payload.capabilities
    profile.certifications = payload.certifications
    profile.target_cpv_codes = payload.target_cpv_codes
    profile.target_departments = payload.target_departments
    profile.target_keywords = payload.target_keywords
    profile.procedure_types = payload.procedure_types
    profile.min_days_remaining = payload.min_days_remaining
    db.commit()
    db.refresh(profile)
    return CompanyProfileSchema(
        id=profile.id,
        name=profile.name,
        siret=profile.siret,
        description=profile.description,
        capabilities=profile.capabilities,
        certifications=profile.certifications,
        target_cpv_codes=profile.target_cpv_codes,
        target_departments=profile.target_departments,
        target_keywords=profile.target_keywords,
        procedure_types=profile.procedure_types,
        min_days_remaining=profile.min_days_remaining,
    )


@router.get("/tenders", response_model=list[TenderNoticeOut])
def list_tenders(
    status: str | None = Query(default=None),
    department: str | None = Query(default=None),
    min_score: int | None = Query(default=None, ge=0, le=100),
    limit: int = Query(default=50, ge=1, le=200),
    db: Session = Depends(get_db),
) -> list[TenderNotice]:
    stmt = select(TenderNotice).order_by(
        desc(TenderNotice.go_no_go_score),
        desc(TenderNotice.publication_date),
        desc(TenderNotice.created_at),
    )
    if status:
        stmt = stmt.where(TenderNotice.status == status)
    if department:
        stmt = stmt.where(TenderNotice.department == department)
    if min_score is not None:
        stmt = stmt.where(TenderNotice.go_no_go_score >= min_score)
    stmt = stmt.limit(limit)
    return list(db.execute(stmt).scalars().all())


@router.post("/tenders/sync")
def trigger_boamp_sync(
    payload: SyncTendersRequest,
    db: Session = Depends(get_db),
) -> dict:
    if payload.async_mode:
        task = poll_boamp_tenders.delay(payload.limit)
        return {"queued": True, "task_id": task.id}
    try:
        stats = sync_boamp_to_db(db, limit=payload.limit)
        return {"queued": False, **stats}
    except Exception as exc:
        raise HTTPException(
            status_code=502,
            detail=f"Échec de synchronisation BOAMP : {exc}",
        ) from exc


@router.patch("/tenders/{tender_id}", response_model=TenderNoticeOut)
def update_tender_status(
    tender_id: int,
    payload: TenderStatusUpdate,
    db: Session = Depends(get_db),
) -> TenderNotice:
    if payload.status not in ALLOWED_STATUSES:
        raise HTTPException(status_code=400, detail=f"Invalid status: {payload.status}")
    tender = db.get(TenderNotice, tender_id)
    if not tender:
        raise HTTPException(status_code=404, detail="Tender not found")
    tender.status = payload.status
    db.commit()
    db.refresh(tender)
    return tender
