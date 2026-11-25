"""Add TRADISTER SASU company fields, EU/TED source metadata, and estimated amounts.

Revision ID: 0002_tradister_eu_and_amounts
Revises: 0001_initial_schema
Create Date: 2026-11-25 07:16:00
"""

import json

from alembic import op
import sqlalchemy as sa

revision = "0002_tradister_eu_and_amounts"
down_revision = "0001_initial_schema"
branch_labels = None
depends_on = None

TRADISTER_CAPABILITIES = [
    "Infogérance & Services Managés IT (MSP)",
    "Support utilisateur & Helpdesk N1/N2/N3 (ITSM)",
    "Conseil en systèmes et logiciels informatiques",
    "Administration Cloud, Microsoft 365 & Infrastructure",
    "Cybersécurité, Protection Endpoints (EDR) & Sauvegarde/PRA",
    "Développement logiciel, intégration API & automatisation",
    "Maintenance applicative (TMA / MCO)",
]

TRADISTER_CERTIFICATIONS = [
    "SASU active immatriculée en France (SIREN 988 318 945)",
    "Code NAF/APE 62.02A — Conseil en systèmes et logiciels informatiques",
]

TRADISTER_CPVS = [
    "72000000",
    "72200000",
    "72300000",
    "72500000",
    "72600000",
    "48000000",
]

TRADISTER_DEPTS = ["91", "75", "92", "93", "94", "77", "78", "95"]

TRADISTER_KEYWORDS = [
    "infogérance",
    "cloud",
    "cybersécurité",
    "support informatique",
    "helpdesk",
    "maintenance applicative",
    "TMA",
    "MCO",
    "développement logiciel",
    "systèmes d'information",
    "ITSM",
    "managed services",
]


def upgrade() -> None:
    # CompanyProfile extensions
    op.add_column("company_profiles", sa.Column("president", sa.String(length=255), nullable=True))
    op.add_column("company_profiles", sa.Column("siren", sa.String(length=16), nullable=True))
    op.add_column("company_profiles", sa.Column("tva_number", sa.String(length=32), nullable=True))
    op.add_column("company_profiles", sa.Column("naf_code", sa.String(length=32), nullable=True))
    op.add_column("company_profiles", sa.Column("address", sa.String(length=512), nullable=True))
    op.add_column("company_profiles", sa.Column("min_target_amount", sa.Float(), nullable=True))
    op.add_column("company_profiles", sa.Column("max_target_amount", sa.Float(), nullable=True))
    op.add_column(
        "company_profiles",
        sa.Column("include_all_france", sa.Boolean(), nullable=False, server_default=sa.text("true")),
    )
    op.add_column(
        "company_profiles",
        sa.Column("include_eu", sa.Boolean(), nullable=False, server_default=sa.text("true")),
    )
    op.add_column(
        "company_profiles",
        sa.Column("min_suitability_score", sa.Integer(), nullable=False, server_default="50"),
    )

    # TenderNotice extensions
    op.add_column(
        "tender_notices",
        sa.Column("source", sa.String(length=16), nullable=False, server_default="BOAMP"),
    )
    op.add_column(
        "tender_notices",
        sa.Column("region", sa.String(length=8), nullable=False, server_default="FR"),
    )
    op.add_column(
        "tender_notices",
        sa.Column("country", sa.String(length=8), nullable=False, server_default="FRA"),
    )
    op.add_column("tender_notices", sa.Column("estimated_amount", sa.Float(), nullable=True))
    op.add_column(
        "tender_notices",
        sa.Column("currency", sa.String(length=8), nullable=False, server_default="EUR"),
    )
    op.create_index("ix_tender_notices_source", "tender_notices", ["source"], unique=False)
    op.create_index("ix_tender_notices_region", "tender_notices", ["region"], unique=False)
    op.create_index("ix_tender_notices_country", "tender_notices", ["country"], unique=False)

    # Persist TRADISTER SASU verified company details into company_profiles
    conn = op.get_bind()
    existing_id = conn.execute(sa.text("SELECT id FROM company_profiles ORDER BY id LIMIT 1")).scalar()
    params = {
        "name": "TRADISTER SASU",
        "president": "Bisma Kashif",
        "siren": "988318945",
        "siret": "98831894500017",
        "tva_number": "FR42988318945",
        "naf_code": "62.02A",
        "address": "11 Rue du Château d'Eau, App 132, 91130 Ris-Orangis, France",
        "description": (
            "TRADISTER SASU (Tradister-Managed IT Services), présidée par Bisma Kashif, "
            "est une société française de conseil en systèmes et logiciels informatiques (NAF 62.02A) "
            "basée à Ris-Orangis (91). Spécialisée en infogérance MSP, support N1/N2/N3, "
            "administration cloud, cybersécurité, ITSM et développement/maintenance applicative."
        ),
        "capabilities": json.dumps(TRADISTER_CAPABILITIES),
        "certifications": json.dumps(TRADISTER_CERTIFICATIONS),
        "target_cpv_codes": json.dumps(TRADISTER_CPVS),
        "target_departments": json.dumps(TRADISTER_DEPTS),
        "target_keywords": json.dumps(TRADISTER_KEYWORDS),
        "min_target_amount": 10000.0,
        "max_target_amount": 500000.0,
        "include_all_france": True,
        "include_eu": True,
        "min_suitability_score": 50,
    }
    if existing_id is not None:
        conn.execute(
            sa.text(
                """
                UPDATE company_profiles
                SET name = :name,
                    president = :president,
                    siren = :siren,
                    siret = :siret,
                    tva_number = :tva_number,
                    naf_code = :naf_code,
                    address = :address,
                    description = :description,
                    capabilities = CAST(:capabilities AS jsonb),
                    certifications = CAST(:certifications AS jsonb),
                    target_cpv_codes = CAST(:target_cpv_codes AS jsonb),
                    target_departments = CAST(:target_departments AS jsonb),
                    target_keywords = CAST(:target_keywords AS jsonb),
                    min_target_amount = :min_target_amount,
                    max_target_amount = :max_target_amount,
                    include_all_france = :include_all_france,
                    include_eu = :include_eu,
                    min_suitability_score = :min_suitability_score,
                    updated_at = NOW()
                WHERE id = :id
                """
            ),
            {**params, "id": existing_id},
        )
    else:
        conn.execute(
            sa.text(
                """
                INSERT INTO company_profiles (
                    name, president, siren, siret, tva_number, naf_code, address,
                    description, capabilities, certifications, target_cpv_codes,
                    target_departments, target_keywords, procedure_types,
                    min_days_remaining, min_target_amount, max_target_amount,
                    include_all_france, include_eu, min_suitability_score
                ) VALUES (
                    :name, :president, :siren, :siret, :tva_number, :naf_code, :address,
                    :description, CAST(:capabilities AS jsonb), CAST(:certifications AS jsonb),
                    CAST(:target_cpv_codes AS jsonb), CAST(:target_departments AS jsonb),
                    CAST(:target_keywords AS jsonb), '[]'::jsonb,
                    5, :min_target_amount, :max_target_amount,
                    :include_all_france, :include_eu, :min_suitability_score
                )
                """
            ),
            params,
        )


def downgrade() -> None:
    op.drop_index("ix_tender_notices_country", table_name="tender_notices")
    op.drop_index("ix_tender_notices_region", table_name="tender_notices")
    op.drop_index("ix_tender_notices_source", table_name="tender_notices")
    op.drop_column("tender_notices", "currency")
    op.drop_column("tender_notices", "estimated_amount")
    op.drop_column("tender_notices", "country")
    op.drop_column("tender_notices", "region")
    op.drop_column("tender_notices", "source")

    op.drop_column("company_profiles", "min_suitability_score")
    op.drop_column("company_profiles", "include_eu")
    op.drop_column("company_profiles", "include_all_france")
    op.drop_column("company_profiles", "max_target_amount")
    op.drop_column("company_profiles", "min_target_amount")
    op.drop_column("company_profiles", "address")
    op.drop_column("company_profiles", "naf_code")
    op.drop_column("company_profiles", "tva_number")
    op.drop_column("company_profiles", "siren")
    op.drop_column("company_profiles", "president")
