"""Initial schema with pgvector extension and core tender tables.

Revision ID: 0001_initial_schema
Revises:
Create Date: 2026-11-25 05:35:00
"""

from alembic import op
import pgvector.sqlalchemy
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "0001_initial_schema"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("CREATE EXTENSION IF NOT EXISTS vector")

    op.create_table(
        "company_profiles",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("siret", sa.String(length=32), nullable=True),
        sa.Column("description", sa.Text(), nullable=False, server_default=""),
        sa.Column("capabilities", postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default="[]"),
        sa.Column("certifications", postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default="[]"),
        sa.Column("target_cpv_codes", postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default="[]"),
        sa.Column("target_departments", postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default="[]"),
        sa.Column("target_keywords", postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default="[]"),
        sa.Column("procedure_types", postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default="[]"),
        sa.Column("min_days_remaining", sa.Integer(), nullable=False, server_default="5"),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("NOW()")),
    )

    op.create_table(
        "tender_notices",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("boamp_id", sa.String(length=128), nullable=False),
        sa.Column("title", sa.String(length=512), nullable=False),
        sa.Column("buyer_name", sa.String(length=255), nullable=True),
        sa.Column("department", sa.String(length=16), nullable=True),
        sa.Column("cpv_codes", postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default="[]"),
        sa.Column("procedure_type", sa.String(length=128), nullable=True),
        sa.Column("publication_date", sa.DateTime(timezone=True), nullable=True),
        sa.Column("deadline_date", sa.DateTime(timezone=True), nullable=True),
        sa.Column("boamp_url", sa.String(length=512), nullable=True),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("raw_payload", postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default="{}"),
        sa.Column(
            "attribution",
            sa.String(length=255),
            nullable=False,
            server_default="source: DILA - BOAMP, Licence Ouverte 2.0",
        ),
        sa.Column("go_no_go_score", sa.Integer(), nullable=True),
        sa.Column("go_no_go_summary", postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default="[]"),
        sa.Column("status", sa.String(length=32), nullable=False, server_default="new"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("NOW()")),
    )
    op.create_index("ix_tender_notices_boamp_id", "tender_notices", ["boamp_id"], unique=True)
    op.create_index("ix_tender_notices_department", "tender_notices", ["department"], unique=False)
    op.create_index("ix_tender_notices_status", "tender_notices", ["status"], unique=False)

    op.create_table(
        "knowledge_documents",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("title", sa.String(length=255), nullable=False),
        sa.Column("category", sa.String(length=64), nullable=False),
        sa.Column("filename", sa.String(length=255), nullable=False),
        sa.Column("storage_path", sa.String(length=512), nullable=False),
        sa.Column("file_type", sa.String(length=32), nullable=False),
        sa.Column("file_size", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("chunk_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("NOW()")),
    )
    op.create_index("ix_knowledge_documents_category", "knowledge_documents", ["category"], unique=False)

    op.create_table(
        "tender_workspaces",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column(
            "tender_notice_id",
            sa.Integer(),
            sa.ForeignKey("tender_notices.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column("title", sa.String(length=512), nullable=False),
        sa.Column("buyer_name", sa.String(length=255), nullable=True),
        sa.Column("reference_code", sa.String(length=128), nullable=True),
        sa.Column("dce_files", postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default="[]"),
        sa.Column("submission_deadline", sa.String(length=128), nullable=True),
        sa.Column("site_visit_required", sa.Boolean(), nullable=True),
        sa.Column("site_visit_details", sa.Text(), nullable=True),
        sa.Column("lots", postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default="[]"),
        sa.Column("evaluation_criteria", postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default="[]"),
        sa.Column("compliance_checklist", postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default="[]"),
        sa.Column(
            "flagged_financial_legal",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=False,
            server_default="[]",
        ),
        sa.Column("memoire_sections", postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default="[]"),
        sa.Column("last_export_path", sa.String(length=512), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("NOW()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("NOW()")),
    )

    op.create_table(
        "document_chunks",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column(
            "knowledge_document_id",
            sa.Integer(),
            sa.ForeignKey("knowledge_documents.id", ondelete="CASCADE"),
            nullable=True,
        ),
        sa.Column(
            "tender_workspace_id",
            sa.Integer(),
            sa.ForeignKey("tender_workspaces.id", ondelete="CASCADE"),
            nullable=True,
        ),
        sa.Column("source_type", sa.String(length=32), nullable=False, server_default="knowledge_base"),
        sa.Column("category", sa.String(length=64), nullable=True),
        sa.Column("document_role", sa.String(length=32), nullable=True),
        sa.Column("chunk_index", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("content", sa.Text(), nullable=False),
        sa.Column("metadata_json", postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default="{}"),
        sa.Column("embedding", pgvector.sqlalchemy.Vector(dim=1536), nullable=False),
    )
    op.create_index("ix_document_chunks_kb_id", "document_chunks", ["knowledge_document_id"], unique=False)
    op.create_index("ix_document_chunks_ws_id", "document_chunks", ["tender_workspace_id"], unique=False)
    op.create_index("ix_document_chunks_source_type", "document_chunks", ["source_type"], unique=False)
    op.create_index("ix_document_chunks_category", "document_chunks", ["category"], unique=False)


def downgrade() -> None:
    op.drop_table("document_chunks")
    op.drop_table("tender_workspaces")
    op.drop_table("knowledge_documents")
    op.drop_table("tender_notices")
    op.drop_table("company_profiles")
