from __future__ import annotations

from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field


class LoginRequest(BaseModel):
    username: str
    password: str


class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    username: str


class CompanyProfileSchema(BaseModel):
    id: int | None = None
    name: str
    president: str | None = None
    siren: str | None = None
    siret: str | None = None
    tva_number: str | None = None
    naf_code: str | None = None
    address: str | None = None
    description: str = ""
    capabilities: list[str] = Field(default_factory=list)
    certifications: list[str] = Field(default_factory=list)
    target_cpv_codes: list[str] = Field(default_factory=list)
    target_departments: list[str] = Field(default_factory=list)
    target_keywords: list[str] = Field(default_factory=list)
    procedure_types: list[str] = Field(default_factory=list)
    min_days_remaining: int = 5
    min_target_amount: float | None = None
    max_target_amount: float | None = None
    include_all_france: bool = True
    include_eu: bool = True
    min_suitability_score: int = 50
    excluded_criteria: list[str] = Field(default_factory=list)


class TenderNoticeOut(BaseModel):
    id: int
    boamp_id: str
    source: str = "BOAMP"
    region: str = "FR"
    country: str = "FRA"
    title: str
    buyer_name: str | None
    department: str | None
    cpv_codes: list[str]
    procedure_type: str | None
    publication_date: datetime | None
    deadline_date: datetime | None
    days_remaining: int | None = None
    estimated_amount: float | None = None
    currency: str = "EUR"
    boamp_url: str | None
    description: str | None
    attribution: str
    go_no_go_score: int | None
    go_no_go_summary: list[str]
    status: str
    created_at: datetime

    model_config = {"from_attributes": True}


class TenderStatusUpdate(BaseModel):
    status: str


class BulkMarkSeenRequest(BaseModel):
    tender_ids: list[int] = Field(default_factory=list)


class SyncTendersRequest(BaseModel):
    limit: int = Field(default=30, ge=1, le=100)
    eu_limit: int = Field(default=25, ge=0, le=100)
    include_eu: bool = True
    async_mode: bool = False


class KnowledgeDocumentOut(BaseModel):
    id: int
    title: str
    category: str
    filename: str
    file_type: str
    file_size: int
    chunk_count: int
    created_at: datetime

    model_config = {"from_attributes": True}


class KnowledgeSearchRequest(BaseModel):
    query: str
    top_k: int = Field(default=5, ge=1, le=20)
    category: str | None = None


class WorkspaceCreateRequest(BaseModel):
    title: str
    buyer_name: str | None = None
    reference_code: str | None = None
    tender_notice_id: int | None = None


class WorkspaceUpdateRequest(BaseModel):
    title: str | None = None
    buyer_name: str | None = None
    reference_code: str | None = None
    compliance_checklist: list[dict[str, Any]] | None = None
    memoire_sections: list[dict[str, Any]] | None = None


class WorkspaceOut(BaseModel):
    id: int
    tender_notice_id: int | None
    title: str
    buyer_name: str | None
    reference_code: str | None
    dce_files: list[dict[str, Any]]
    submission_deadline: str | None
    site_visit_required: bool | None
    site_visit_details: str | None
    lots: list[dict[str, Any]]
    evaluation_criteria: list[dict[str, Any]]
    compliance_checklist: list[dict[str, Any]]
    flagged_financial_legal: list[dict[str, Any]]
    memoire_sections: list[dict[str, Any]]
    last_export_path: str | None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
