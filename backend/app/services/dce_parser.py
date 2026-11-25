from __future__ import annotations

import csv
import io
import logging
import zipfile
from dataclasses import dataclass
from pathlib import Path

import fitz  # PyMuPDF
import openpyxl
import pdfplumber
from docx import Document

logger = logging.getLogger(__name__)

ROLE_KEYWORDS: dict[str, tuple[str, ...]] = {
    "RC": (
        "reglement de la consultation",
        "règlement de la consultation",
        "reglement_consultation",
        "rc_",
        "_rc",
        "rc.",
        "date limite de remise",
        "criteres d'attribution",
        "critères d'attribution",
    ),
    "CCTP": (
        "cctp",
        "clauses techniques particulieres",
        "clauses techniques particulières",
        "cahier des charges",
        "specifications techniques",
        "spécifications techniques",
    ),
    "CCAP": (
        "ccap",
        "clauses administratives particulieres",
        "clauses administratives particulières",
        "penalites",
        "pénalités",
        "retenue de garantie",
    ),
    "BPU": (
        "bpu",
        "bordereau des prix",
        "prix unitaires",
    ),
    "DPGF": (
        "dpgf",
        "decomposition du prix",
        "décomposition du prix",
        "prix global et forfaitaire",
        "dqe",
    ),
}


@dataclass
class ParsedDocument:
    filename: str
    storage_path: str
    role: str
    text: str
    size: int
    notes: str = ""


def classify_dce_role(filename: str, text_preview: str) -> str:
    """Classify a DCE file as RC, CCTP, CCAP, BPU, DPGF, or OTHER."""
    haystack_name = filename.lower()
    haystack_text = text_preview[:4000].lower()

    for role, patterns in ROLE_KEYWORDS.items():
        if any(p in haystack_name for p in patterns):
            return role

    scores = {role: 0 for role in ROLE_KEYWORDS}
    for role, patterns in ROLE_KEYWORDS.items():
        for pattern in patterns:
            if pattern in haystack_text:
                scores[role] += 1

    best_role, best_score = max(scores.items(), key=lambda item: item[1])
    return best_role if best_score > 0 else "OTHER"


def extract_text_from_pdf(path: Path) -> str:
    """Extract text from PDF using PyMuPDF, falling back to pdfplumber when empty."""
    chunks: list[str] = []
    try:
        with fitz.open(path) as doc:
            for page in doc:
                txt = page.get_text("text")
                if txt:
                    chunks.append(txt)
    except Exception as exc:
        logger.warning("PyMuPDF failed on %s: %s", path.name, exc)

    combined = "\n".join(chunks).strip()
    if len(combined) >= 40:
        return combined

    # Fallback for table-heavy PDFs via pdfplumber
    plumber_chunks: list[str] = []
    try:
        with pdfplumber.open(path) as pdf:
            for page in pdf.pages:
                txt = page.extract_text() or ""
                if txt:
                    plumber_chunks.append(txt)
    except Exception as exc:
        logger.warning("pdfplumber failed on %s: %s", path.name, exc)
    return "\n".join(plumber_chunks).strip() or combined


def extract_text_from_docx(path: Path) -> str:
    doc = Document(path)
    parts: list[str] = [p.text for p in doc.paragraphs if p.text.strip()]
    for table in doc.tables:
        for row in table.rows:
            cells = [c.text.strip().replace("\n", " ") for c in row.cells]
            if any(cells):
                parts.append(" | ".join(cells))
    return "\n".join(parts).strip()


def extract_text_from_xlsx(path: Path) -> tuple[str, str]:
    """Extract sheet structure and sample lines from XLSX without auto-computing binding prices."""
    wb = openpyxl.load_workbook(path, data_only=True, read_only=True)
    lines: list[str] = []
    sheet_names = wb.sheetnames
    for sheet_name in sheet_names[:10]:
        ws = wb[sheet_name]
        lines.append(f"=== Onglet: {sheet_name} ===")
        row_count = 0
        for row in ws.iter_rows(values_only=True):
            vals = [str(v).strip() if v is not None else "" for v in row]
            if any(vals):
                lines.append(" | ".join(vals[:12]))
                row_count += 1
            if row_count >= 120:
                lines.append("... [lignes supplémentaires tronquées — vérification humaine requise]")
                break
    wb.close()
    note = f"Classeur Excel ({len(sheet_names)} onglet(s)) — Vérification tarifaire humaine requise."
    return "\n".join(lines).strip(), note


def extract_text_from_file(path: Path) -> tuple[str, str]:
    suffix = path.suffix.lower()
    if suffix == ".pdf":
        return extract_text_from_pdf(path), ""
    if suffix == ".docx":
        return extract_text_from_docx(path), ""
    if suffix in {".xlsx", ".xlsm"}:
        return extract_text_from_xlsx(path)
    if suffix == ".csv":
        content = path.read_text(encoding="utf-8", errors="ignore")
        reader = csv.reader(io.StringIO(content))
        rows = [" | ".join(r) for _, r in zip(range(150), reader)]
        return "\n".join(rows), ""
    if suffix in {".txt", ".md", ".json"}:
        return path.read_text(encoding="utf-8", errors="ignore"), ""
    return "", f"Format non pris en charge pour extraction automatique ({suffix})."


def safe_extract_zip(zip_path: Path, dest_dir: Path) -> list[Path]:
    """Extract ZIP archive safely while guarding against Zip Slip path traversal."""
    extracted: list[Path] = []
    dest_resolved = dest_dir.resolve()
    with zipfile.ZipFile(zip_path, "r") as zf:
        for member in zf.infolist():
            if member.is_dir():
                continue
            member_name = Path(member.filename).name
            if not member_name or member_name.startswith(".") or "__MACOSX" in member.filename:
                continue
            target_path = (dest_resolved / member.filename).resolve()
            if not str(target_path).startswith(str(dest_resolved)):
                raise ValueError(f"Unsafe zip entry detected: {member.filename}")
            target_path.parent.mkdir(parents=True, exist_ok=True)
            with zf.open(member, "r") as src, open(target_path, "wb") as dst:
                dst.write(src.read())
            extracted.append(target_path)
    return extracted


def process_uploaded_dce_files(saved_paths: list[Path], workspace_dir: Path) -> list[ParsedDocument]:
    """Expand any ZIP files and parse all supported DCE documents."""
    candidate_paths: list[Path] = []
    for p in saved_paths:
        if p.suffix.lower() == ".zip":
            extract_dir = workspace_dir / f"extracted_{p.stem}"
            extract_dir.mkdir(parents=True, exist_ok=True)
            candidate_paths.extend(safe_extract_zip(p, extract_dir))
        else:
            candidate_paths.append(p)

    parsed_docs: list[ParsedDocument] = []
    for file_path in candidate_paths:
        text, note = extract_text_from_file(file_path)
        role = classify_dce_role(file_path.name, text)
        parsed_docs.append(
            ParsedDocument(
                filename=file_path.name,
                storage_path=str(file_path),
                role=role,
                text=text,
                size=file_path.stat().st_size if file_path.exists() else 0,
                notes=note,
            )
        )
    return parsed_docs


def chunk_text(text: str, chunk_size: int = 1200, overlap: int = 200) -> list[str]:
    """Split text into overlapping character chunks aligned cleanly on whitespace."""
    cleaned = " ".join(text.split())
    if not cleaned:
        return []
    if len(cleaned) <= chunk_size:
        return [cleaned]

    chunks: list[str] = []
    start = 0
    while start < len(cleaned):
        end = min(len(cleaned), start + chunk_size)
        if end < len(cleaned):
            space_idx = cleaned.rfind(" ", start + chunk_size // 2, end)
            if space_idx > start:
                end = space_idx
        piece = cleaned[start:end].strip()
        if piece:
            chunks.append(piece)
        if end >= len(cleaned):
            break
        start = max(end - overlap, start + 1)
    return chunks
