from pathlib import Path
from types import SimpleNamespace

from app.services.boamp_client import BoampClient, DILA_ATTRIBUTION
from app.services.dce_parser import chunk_text, classify_dce_role
from app.services.docx_builder import build_memoire_docx
from app.services.llm_analyzer import LlmAnalyzer


def test_boamp_record_normalization_includes_dila_attribution() -> None:
    client = BoampClient()
    rec = client.normalize_record(
        {
            "idweb": "26-12345",
            "objet": "Tierce maintenance applicative et hébergement cloud",
            "nomacheteur": "Ville de Paris",
            "code_departement": ["75"],
            "dc": ["72267000"],
            "type_procedure": "Procédure adaptée",
            "dateparution": "2026-11-20",
            "datelimitereponse": "2026-12-20T12:00:00Z",
        }
    )
    assert rec["boamp_id"] == "26-12345"
    assert rec["department"] == "75"
    assert rec["attribution"] == DILA_ATTRIBUTION


def test_dce_classification_and_chunking() -> None:
    assert classify_dce_role("01_RC_Consultation.pdf", "") == "RC"
    assert classify_dce_role("annexe.pdf", "Cahier des clauses techniques particulières") == "CCTP"
    assert classify_dce_role("BPU_Lot1.xlsx", "") == "BPU"

    chunks = chunk_text("mot " * 600, chunk_size=300, overlap=50)
    assert len(chunks) > 1
    assert all(len(c) <= 300 for c in chunks)


def test_heuristic_go_no_go_and_docx_export(tmp_path: Path) -> None:
    analyzer = LlmAnalyzer()
    profile = SimpleNamespace(
        name="Alpha Cloud SAS",
        siret="12345678900012",
        description="Cloud et infogérance",
        capabilities=["Infogérance"],
        certifications=["ISO 27001"],
        target_cpv_codes=["72000000"],
        target_departments=["75"],
        target_keywords=["cloud"],
    )
    score, summary = analyzer._heuristic_go_no_go(
        profile,
        {
            "title": "Infogérance cloud secteur public",
            "description": "Prestation cloud souverain",
            "department": "75",
            "cpv_codes": ["72267000"],
        },
    )
    assert 0 <= score <= 100
    assert len(summary) == 3

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
