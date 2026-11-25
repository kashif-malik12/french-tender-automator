from datetime import datetime, timedelta, timezone
from pathlib import Path
from types import SimpleNamespace

from app.services.boamp_client import BoampClient, DILA_ATTRIBUTION
from app.services.dce_parser import chunk_text, classify_dce_role
from app.services.docx_builder import build_memoire_docx
from app.services.llm_analyzer import LlmAnalyzer
from app.services.ted_client import TED_ATTRIBUTION, TedClient


def test_boamp_record_normalization_includes_dila_attribution_and_amount() -> None:
    client = BoampClient()
    rec = client.normalize_record(
        {
            "idweb": "26-12345",
            "objet": "Tierce maintenance applicative et hébergement cloud",
            "nomacheteur": "Ville de Paris",
            "code_departement": ["75"],
            "dc": ["160"],
            "type_procedure": "Procédure adaptée",
            "dateparution": "2026-11-20",
            "datelimitereponse": "2026-12-20T12:00:00Z",
            "donnees": (
                '{"EFORMS": {"ContractNotice": {"cac:ProcurementProject": {'
                '"cac:MainCommodityClassification": {"cbc:ItemClassificationCode": {"@listName": "cpv", "#text": "72267000"}},'
                '"cac:RequestedTenderTotal": {"cbc:EstimatedOverallContractAmount": {"@currencyID": "EUR", "#text": "240000"}}'
                "}}}}"
            ),
        }
    )
    assert rec["boamp_id"] == "26-12345"
    assert rec["source"] == "BOAMP"
    assert rec["region"] == "FR"
    assert rec["department"] == "75"
    assert "72267000" in rec["cpv_codes"]
    assert rec["estimated_amount"] == 240000.0
    assert rec["currency"] == "EUR"
    assert rec["attribution"] == DILA_ATTRIBUTION

    where = client.build_where_clause(
        cpv_codes=["72000000"],
        keywords=["systèmes d'information", "infogérance"],
        only_open=True,
        include_all_france=True,
    )
    assert "d''information" not in where
    assert "d information" in where


def test_ted_record_normalization_extracts_eu_metadata() -> None:
    client = TedClient()
    rec = client.normalize_record(
        {
            "publication-number": "800169-2026",
            "title-proc": {"eng": "Managed Endpoint Protection & Cloud Security Services"},
            "buyer-name": {"eng": ["University College Dublin"]},
            "place-of-performance-country-proc": ["IRL"],
            "deadline-receipt-tender-date-lot": ["2026-12-22Z"],
            "estimated-value-proc": "480000",
            "estimated-value-cur-proc": "EUR",
            "classification-cpv": ["72500000", "72222300"],
            "procedure-type": "open",
            "publication-date": "2026-11-20+01:00",
        }
    )
    assert rec["boamp_id"] == "TED:800169-2026"
    assert rec["source"] == "TED"
    assert rec["region"] == "EU"
    assert rec["country"] == "IRL"
    assert rec["estimated_amount"] == 480000.0
    assert rec["currency"] == "EUR"
    assert rec["attribution"] == TED_ATTRIBUTION


def test_dce_classification_and_chunking() -> None:
    assert classify_dce_role("01_RC_Consultation.pdf", "") == "RC"
    assert classify_dce_role("annexe.pdf", "Cahier des clauses techniques particulières") == "CCTP"
    assert classify_dce_role("BPU_Lot1.xlsx", "") == "BPU"

    chunks = chunk_text("mot " * 600, chunk_size=300, overlap=50)
    assert len(chunks) > 1
    assert all(len(c) <= 300 for c in chunks)


def test_heuristic_go_no_go_relevance_and_docx_export(tmp_path: Path) -> None:
    analyzer = LlmAnalyzer()
    profile = SimpleNamespace(
        name="TRADISTER SASU",
        siret="98831894500017",
        naf_code="62.02A",
        description="Infogérance, cloud, cybersécurité, conseil logiciel",
        capabilities=["Infogérance MSP", "Cybersécurité"],
        certifications=["NAF 62.02A"],
        target_cpv_codes=["72000000", "72500000"],
        target_departments=["91", "75"],
        target_keywords=["cloud", "infogérance"],
        min_target_amount=10000.0,
        max_target_amount=500000.0,
    )

    future_dl = datetime.now(timezone.utc) + timedelta(days=20)
    fr_tender = {
        "source": "BOAMP",
        "region": "FR",
        "country": "FRA",
        "title": "Infogérance cloud secteur public",
        "description": "Prestation cloud souverain et support N1/N2",
        "department": "91",
        "cpv_codes": ["72500000"],
        "estimated_amount": 180000.0,
        "currency": "EUR",
        "deadline_date": future_dl,
    }
    eu_tender = {
        "source": "TED",
        "region": "EU",
        "country": "IRL",
        "title": "Cloud Managed Services",
        "description": "ITSM and cloud support",
        "department": "IRL",
        "cpv_codes": ["72500000"],
        "estimated_amount": 480000.0,
        "currency": "EUR",
        "deadline_date": future_dl,
    }
    unrelated_tender = {
        "source": "BOAMP",
        "region": "FR",
        "country": "FRA",
        "title": "Travaux de réfection de voirie communale",
        "description": "Enrobés bitumineux et terrassement",
        "department": "91",
        "cpv_codes": ["45233140"],
    }

    assert analyzer.is_relevant_to_profile(profile, fr_tender) is True
    assert analyzer.is_relevant_to_profile(profile, unrelated_tender) is False

    fr_score, fr_summary = analyzer._heuristic_go_no_go(profile, fr_tender)
    eu_score, eu_summary = analyzer._heuristic_go_no_go(profile, eu_tender)
    assert 0 <= fr_score <= 100
    assert 0 <= eu_score <= 100
    assert fr_score > eu_score
    assert len(fr_summary) == 3
    assert len(eu_summary) == 3

    ws = SimpleNamespace(
        id=1,
        title="Marché Test Cloud",
        buyer_name="Mairie Test",
        reference_code="26-TEST",
        submission_deadline="20/12/2026 à 12h00",
        evaluation_criteria=[{"name": "Valeur Technique", "weight": "60%"}],
        memoire_sections=[
            {
                "title": "1. Méthodologie",
                "cctp_requirement": "Assurer la continuité de service.",
                "draft_markdown": "Engagement de service [À COMPLÉTER PAR L'ÉQUIPE : GTR].",
                "citations": [],
            }
        ],
    )
    out = build_memoire_docx(ws, profile, tmp_path / "memoire.docx")
    assert out.exists() and out.stat().st_size > 1000
