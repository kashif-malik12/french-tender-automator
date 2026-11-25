from __future__ import annotations

import re
from datetime import datetime, timezone
from pathlib import Path

from docx import Document
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.shared import Inches, Pt, RGBColor

from app.models.db_models import CompanyProfile, TenderWorkspace


def _add_formatted_paragraph(doc: Document, text: str) -> None:
    """Render a paragraph while highlighting [À COMPLÉTER PAR L'ÉQUIPE] placeholders in amber/red."""
    p = doc.add_paragraph()
    pattern = re.compile(r"(\[À COMPLÉTER PAR L'ÉQUIPE[^\]]*\])")
    parts = pattern.split(text)
    for part in parts:
        if not part:
            continue
        run = p.add_run(part)
        if part.startswith("[À COMPLÉTER PAR L'ÉQUIPE"):
            run.bold = True
            run.font.color.rgb = RGBColor(0xB9, 0x1C, 0x1C)
        else:
            run.font.size = Pt(10.5)


def build_memoire_docx(
    workspace: TenderWorkspace,
    profile: CompanyProfile | None,
    output_path: Path,
) -> Path:
    """Build a professionally formatted Word (.docx) mémoire technique with human-review markers."""
    doc = Document()

    for section in doc.sections:
        section.top_margin = Inches(0.9)
        section.bottom_margin = Inches(0.9)
        section.left_margin = Inches(0.95)
        section.right_margin = Inches(0.95)

    # --- Cover Page ---
    title_p = doc.add_paragraph()
    title_p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    title_run = title_p.add_run("MÉMOIRE TECHNIQUE")
    title_run.bold = True
    title_run.font.size = Pt(26)
    title_run.font.color.rgb = RGBColor(0x0F, 0x2B, 0x5B)

    subtitle_p = doc.add_paragraph()
    subtitle_p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    sub_run = subtitle_p.add_run(workspace.title)
    sub_run.bold = True
    sub_run.font.size = Pt(15)
    sub_run.font.color.rgb = RGBColor(0x1E, 0x40, 0xAF)

    doc.add_paragraph()

    meta_table = doc.add_table(rows=5, cols=2)
    meta_table.style = "Table Grid"
    meta_rows = [
        ("Acheteur public", workspace.buyer_name or "[À COMPLÉTER PAR L'ÉQUIPE]"),
        ("Référence consultation", workspace.reference_code or "[À COMPLÉTER PAR L'ÉQUIPE]"),
        ("Date limite de remise", workspace.submission_deadline or "[À COMPLÉTER PAR L'ÉQUIPE]"),
        ("Entreprise candidate", profile.name if profile else "[À COMPLÉTER PAR L'ÉQUIPE]"),
        ("SIRET", (profile.siret if profile and profile.siret else "[À COMPLÉTER PAR L'ÉQUIPE]")),
    ]
    for idx, (label, val) in enumerate(meta_rows):
        row = meta_table.rows[idx]
        row.cells[0].text = label
        row.cells[1].text = str(val)

    doc.add_paragraph()
    guardrail = doc.add_paragraph()
    g_run = guardrail.add_run(
        "AVERTISSEMENT CONTRÔLE HUMAIN : Ce document constitue un premier jet généré par assistance IA. "
        "Avant dépôt sur le profil acheteur (PLACE, Maximilien, AWS…), l'équipe doit vérifier chaque marqueur "
        "[À COMPLÉTER PAR L'ÉQUIPE], contrôler le BPU/DPGF, joindre les attestations fiscales/sociales à jour "
        "et apposer la signature électronique (RGS / eIDAS)."
    )
    g_run.bold = True
    g_run.font.size = Pt(9.5)
    g_run.font.color.rgb = RGBColor(0x9A, 0x34, 0x12)

    date_p = doc.add_paragraph()
    date_p.alignment = WD_ALIGN_PARAGRAPH.RIGHT
    date_p.add_run(f"Généré le {datetime.now(timezone.utc).strftime('%d/%m/%Y')}").italic = True

    doc.add_page_break()

    # --- Table of Contents Placeholder ---
    doc.add_heading("Sommaire", level=1)
    doc.add_paragraph("[À METTRE À JOUR DANS WORD — Insertion > Table des matières]")
    for sec in workspace.memoire_sections or []:
        doc.add_paragraph(f"• {sec.get('title', 'Section')}", style="List Bullet")

    # --- Evaluation Criteria Summary ---
    if workspace.evaluation_criteria:
        doc.add_heading("Critères d'attribution identifiés (RC)", level=2)
        crit_table = doc.add_table(rows=1 + len(workspace.evaluation_criteria), cols=2)
        crit_table.style = "Table Grid"
        crit_table.rows[0].cells[0].text = "Critère"
        crit_table.rows[0].cells[1].text = "Pondération"
        for i, crit in enumerate(workspace.evaluation_criteria, start=1):
            crit_table.rows[i].cells[0].text = str(crit.get("name", ""))
            crit_table.rows[i].cells[1].text = str(crit.get("weight", ""))

    doc.add_page_break()

    # --- Mémoire Technique Sections ---
    for sec in workspace.memoire_sections or []:
        doc.add_heading(sec.get("title", "Section"), level=1)

        req_text = sec.get("cctp_requirement", "")
        if req_text:
            req_p = doc.add_paragraph()
            r_label = req_p.add_run("Exigence CCTP couverte : ")
            r_label.bold = True
            r_label.font.color.rgb = RGBColor(0x1E, 0x3A, 0x8A)
            r_body = req_p.add_run(req_text)
            r_body.italic = True

        draft = sec.get("draft_markdown", "")
        for raw_line in draft.splitlines():
            line = raw_line.strip()
            if not line:
                continue
            if line.startswith("#### "):
                doc.add_heading(line[5:], level=3)
            elif line.startswith("### "):
                doc.add_heading(line[4:], level=2)
            elif line.startswith("- ") or line.startswith("* "):
                p = doc.add_paragraph(style="List Bullet")
                p.add_run(line[2:].replace("**", ""))
            else:
                _add_formatted_paragraph(doc, line.replace("**", ""))

        citations = sec.get("citations") or []
        if citations:
            cit_p = doc.add_paragraph()
            cit_run = cit_p.add_run(
                "Sources internes citées : "
                + "; ".join(f"{c.get('document_title', 'Base interne')} ({c.get('category', '')})" for c in citations[:3])
            )
            cit_run.italic = True
            cit_run.font.size = Pt(8.5)
            cit_run.font.color.rgb = RGBColor(0x47, 0x55, 0x69)

    output_path.parent.mkdir(parents=True, exist_ok=True)
    doc.save(str(output_path))
    return output_path
