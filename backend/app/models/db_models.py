from datetime import datetime, timezone
from typing import Any

from pgvector.sqlalchemy import Vector
from sqlalchemy import Boolean, DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


class CompanyProfile(Base):
    """Company capabilities, certifications, and FR/EU tender monitoring filters."""

    __tablename__ = "company_profiles"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    president: Mapped[str | None] = mapped_column(String(255), nullable=True)
    siren: Mapped[str | None] = mapped_column(String(16), nullable=True)
    siret: Mapped[str | None] = mapped_column(String(32), nullable=True)
    tva_number: Mapped[str | None] = mapped_column(String(32), nullable=True)
    naf_code: Mapped[str | None] = mapped_column(String(32), nullable=True)
    address: Mapped[str | None] = mapped_column(String(512), nullable=True)
    description: Mapped[str] = mapped_column(Text, default="", nullable=False)
    capabilities: Mapped[list[str]] = mapped_column(JSONB, default=list, nullable=False)
    certifications: Mapped[list[str]] = mapped_column(JSONB, default=list, nullable=False)
    target_cpv_codes: Mapped[list[str]] = mapped_column(JSONB, default=list, nullable=False)
    target_departments: Mapped[list[str]] = mapped_column(JSONB, default=list, nullable=False)
    target_keywords: Mapped[list[str]] = mapped_column(JSONB, default=list, nullable=False)
    procedure_types: Mapped[list[str]] = mapped_column(JSONB, default=list, nullable=False)
    min_days_remaining: Mapped[int] = mapped_column(Integer, default=5, nullable=False)
    min_target_amount: Mapped[float | None] = mapped_column(Float, nullable=True)
    max_target_amount: Mapped[float | None] = mapped_column(Float, nullable=True)
    include_all_france: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    include_eu: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    min_suitability_score: Mapped[int] = mapped_column(Integer, default=50, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, onupdate=utcnow, nullable=False
    )


class TenderNotice(Base):
    """Ingested BOAMP (France) or TED (EU) public procurement notice with suitability qualification."""

    __tablename__ = "tender_notices"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    boamp_id: Mapped[str] = mapped_column(String(128), unique=True, index=True, nullable=False)
    source: Mapped[str] = mapped_column(String(16), default="BOAMP", index=True, nullable=False)
    region: Mapped[str] = mapped_column(String(8), default="FR", index=True, nullable=False)
    country: Mapped[str] = mapped_column(String(8), default="FRA", index=True, nullable=False)
    title: Mapped[str] = mapped_column(String(512), nullable=False)
    buyer_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    department: Mapped[str | None] = mapped_column(String(16), index=True, nullable=True)
    cpv_codes: Mapped[list[str]] = mapped_column(JSONB, default=list, nullable=False)
    procedure_type: Mapped[str | None] = mapped_column(String(128), nullable=True)
    publication_date: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    deadline_date: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    estimated_amount: Mapped[float | None] = mapped_column(Float, nullable=True)
    currency: Mapped[str] = mapped_column(String(8), default="EUR", nullable=False)
    boamp_url: Mapped[str | None] = mapped_column(String(512), nullable=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    raw_payload: Mapped[dict[str, Any]] = mapped_column(JSONB, default=dict, nullable=False)
    attribution: Mapped[str] = mapped_column(
        String(255),
        default="source: DILA - BOAMP, Licence Ouverte 2.0",
        nullable=False,
    )
    go_no_go_score: Mapped[int | None] = mapped_column(Integer, nullable=True)
    go_no_go_summary: Mapped[list[str]] = mapped_column(JSONB, default=list, nullable=False)
    status: Mapped[str] = mapped_column(String(32), default="new", index=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, nullable=False)

    workspaces: Mapped[list["TenderWorkspace"]] = relationship(
        "TenderWorkspace", back_populates="tender_notice"
    )


class KnowledgeDocument(Base):
    """Company knowledge base document stored on disk and indexed via pgvector."""

    __tablename__ = "knowledge_documents"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    category: Mapped[str] = mapped_column(String(64), index=True, nullable=False)
    filename: Mapped[str] = mapped_column(String(255), nullable=False)
    storage_path: Mapped[str] = mapped_column(String(512), nullable=False)
    file_type: Mapped[str] = mapped_column(String(32), nullable=False)
    file_size: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    chunk_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, nullable=False)

    chunks: Mapped[list["DocumentChunk"]] = relationship(
        "DocumentChunk",
        back_populates="knowledge_document",
        cascade="all, delete-orphan",
    )


class TenderWorkspace(Base):
    """Active tender workspace holding uploaded DCE files, compliance matrix, and mémoire draft."""

    __tablename__ = "tender_workspaces"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    tender_notice_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("tender_notices.id", ondelete="SET NULL"), nullable=True
    )
    title: Mapped[str] = mapped_column(String(512), nullable=False)
    buyer_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    reference_code: Mapped[str | None] = mapped_column(String(128), nullable=True)
    dce_files: Mapped[list[dict[str, Any]]] = mapped_column(JSONB, default=list, nullable=False)
    submission_deadline: Mapped[str | None] = mapped_column(String(128), nullable=True)
    site_visit_required: Mapped[bool | None] = mapped_column(Boolean, nullable=True)
    site_visit_details: Mapped[str | None] = mapped_column(Text, nullable=True)
    lots: Mapped[list[dict[str, Any]]] = mapped_column(JSONB, default=list, nullable=False)
    evaluation_criteria: Mapped[list[dict[str, Any]]] = mapped_column(
        JSONB, default=list, nullable=False
    )
    compliance_checklist: Mapped[list[dict[str, Any]]] = mapped_column(
        JSONB, default=list, nullable=False
    )
    flagged_financial_legal: Mapped[list[dict[str, Any]]] = mapped_column(
        JSONB, default=list, nullable=False
    )
    memoire_sections: Mapped[list[dict[str, Any]]] = mapped_column(
        JSONB, default=list, nullable=False
    )
    last_export_path: Mapped[str | None] = mapped_column(String(512), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, onupdate=utcnow, nullable=False
    )

    tender_notice: Mapped[TenderNotice | None] = relationship(
        "TenderNotice", back_populates="workspaces"
    )
    chunks: Mapped[list["DocumentChunk"]] = relationship(
        "DocumentChunk",
        back_populates="tender_workspace",
        cascade="all, delete-orphan",
    )


class DocumentChunk(Base):
    """Vector-indexed text chunk from either Knowledge Base or DCE documents."""

    __tablename__ = "document_chunks"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    knowledge_document_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("knowledge_documents.id", ondelete="CASCADE"), nullable=True, index=True
    )
    tender_workspace_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("tender_workspaces.id", ondelete="CASCADE"), nullable=True, index=True
    )
    source_type: Mapped[str] = mapped_column(String(32), default="knowledge_base", index=True, nullable=False)
    category: Mapped[str | None] = mapped_column(String(64), index=True, nullable=True)
    document_role: Mapped[str | None] = mapped_column(String(32), nullable=True)
    chunk_index: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    metadata_json: Mapped[dict[str, Any]] = mapped_column(JSONB, default=dict, nullable=False)
    embedding: Mapped[list[float]] = mapped_column(Vector(1536), nullable=False)

    knowledge_document: Mapped[KnowledgeDocument | None] = relationship(
        "KnowledgeDocument", back_populates="chunks"
    )
    tender_workspace: Mapped[TenderWorkspace | None] = relationship(
        "TenderWorkspace", back_populates="chunks"
    )
