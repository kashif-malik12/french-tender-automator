from __future__ import annotations

import uuid
from pathlib import Path
from typing import Any

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from sqlalchemy import desc, select
from sqlalchemy.orm import Session

from app.auth import require_auth
from app.config import get_settings
from app.database import get_db
from app.models.db_models import TenderNotice, TenderWorkspace
from app.schemas import WorkspaceCreateRequest, WorkspaceOut, WorkspaceUpdateRequest
from app.services.dce_parser import process_uploaded_dce_files
from app.services.llm_analyzer import LlmAnalyzer
from app.services.rag_engine import RagEngine
from app.worker import get_or_create_company_profile

router = APIRouter(prefix="/workspaces", tags=["workspaces"], dependencies=[Depends(require_auth)])


@router.get("", response_model=list[WorkspaceOut])
def list_workspaces(db: Session = Depends(get_db)) -> list[TenderWorkspace]:
    stmt = select(TenderWorkspace).order_by(desc(TenderWorkspace.updated_at))
    return list(db.execute(stmt).scalars().all())


@router.post("", response_model=WorkspaceOut)
def create_workspace(
    payload: WorkspaceCreateRequest,
    db: Session = Depends(get_db),
) -> TenderWorkspace:
    buyer_name = payload.buyer_name
    reference_code = payload.reference_code
    title = payload.title

    if payload.tender_notice_id:
        notice = db.get(TenderNotice, payload.tender_notice_id)
        if notice:
            buyer_name = buyer_name or notice.buyer_name
            reference_code = reference_code or notice.boamp_id
            title = title or notice.title
            notice.status = "in_progress"

    ws = TenderWorkspace(
        tender_notice_id=payload.tender_notice_id,
        title=title[:512],
        buyer_name=buyer_name[:255] if buyer_name else None,
        reference_code=reference_code[:128] if reference_code else None,
    )
    db.add(ws)
    db.commit()
    db.refresh(ws)
    return ws


@router.get("/{workspace_id}", response_model=WorkspaceOut)
def get_workspace(workspace_id: int, db: Session = Depends(get_db)) -> TenderWorkspace:
    ws = db.get(TenderWorkspace, workspace_id)
    if not ws:
        raise HTTPException(status_code=404, detail="Workspace not found")
    return ws


@router.patch("/{workspace_id}", response_model=WorkspaceOut)
def update_workspace(
    workspace_id: int,
    payload: WorkspaceUpdateRequest,
    db: Session = Depends(get_db),
) -> TenderWorkspace:
    ws = db.get(TenderWorkspace, workspace_id)
    if not ws:
        raise HTTPException(status_code=404, detail="Workspace not found")

    if payload.title is not None:
        ws.title = payload.title[:512]
    if payload.buyer_name is not None:
        ws.buyer_name = payload.buyer_name[:255]
    if payload.reference_code is not None:
        ws.reference_code = payload.reference_code[:128]
    if payload.compliance_checklist is not None:
        ws.compliance_checklist = payload.compliance_checklist
    if payload.memoire_sections is not None:
        ws.memoire_sections = payload.memoire_sections

    db.commit()
    db.refresh(ws)
    return ws


@router.post("/{workspace_id}/upload-dce", response_model=WorkspaceOut)
async def upload_dce_archive(
    workspace_id: int,
    files: list[UploadFile] = File(...),
    db: Session = Depends(get_db),
) -> TenderWorkspace:
    ws = db.get(TenderWorkspace, workspace_id)
    if not ws:
        raise HTTPException(status_code=404, detail="Workspace not found")

    settings = get_settings()
    ws_dir = settings.dce_dir / f"ws_{ws.id}"
    ws_dir.mkdir(parents=True, exist_ok=True)

    saved_paths: list[Path] = []
    for upload in files:
        safe_name = Path(upload.filename or "dce_file").name
        dest = ws_dir / f"{uuid.uuid4().hex[:8]}_{safe_name}"
        dest.write_bytes(await upload.read())
        saved_paths.append(dest)

    try:
        parsed_docs = process_uploaded_dce_files(saved_paths, ws_dir)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    profile = get_or_create_company_profile(db)
    rag = RagEngine()
    rag.index_dce_documents(db, ws, parsed_docs)

    analyzer = LlmAnalyzer()
    analysis = analyzer.analyze_dce_documents(parsed_docs, profile)

    existing_files = list(ws.dce_files or [])
    for doc in parsed_docs:
        existing_files.append(
            {
                "filename": doc.filename,
                "role": doc.role,
                "size": doc.size,
                "extracted_chars": len(doc.text),
                "notes": doc.notes,
            }
        )

    ws.dce_files = existing_files
    ws.submission_deadline = analysis.get("submission_deadline")
    ws.site_visit_required = bool(analysis.get("site_visit_required", False))
    ws.site_visit_details = analysis.get("site_visit_details")
    ws.lots = analysis.get("lots", [])
    ws.evaluation_criteria = analysis.get("evaluation_criteria", [])
    ws.compliance_checklist = analysis.get("compliance_checklist", [])
    ws.flagged_financial_legal = analysis.get("flagged_financial_legal", [])

    # Generate initial RAG-grounded drafts for each section in proposed_outline
    sections: list[dict[str, Any]] = []
    for item in analysis.get("proposed_outline", []):
        sec_title = item.get("title", "Section")
        cctp_req = item.get("cctp_requirement", "")
        rag_hits = rag.retrieve_knowledge_chunks(db, f"{sec_title} {cctp_req}", top_k=4)
        draft_res = analyzer.draft_memoire_section(sec_title, cctp_req, profile, rag_hits)
        sections.append(
            {
                "id": item.get("id") or uuid.uuid4().hex[:8],
                "title": sec_title,
                "cctp_requirement": cctp_req,
                "weight_hint": item.get("weight_hint", ""),
                "draft_markdown": draft_res["draft_markdown"],
                "citations": draft_res["citations"],
            }
        )

    ws.memoire_sections = sections
    db.commit()
    db.refresh(ws)
    return ws


@router.post("/{workspace_id}/sections/{section_id}/regenerate", response_model=WorkspaceOut)
def regenerate_section_draft(
    workspace_id: int,
    section_id: str,
    db: Session = Depends(get_db),
) -> TenderWorkspace:
    ws = db.get(TenderWorkspace, workspace_id)
    if not ws:
        raise HTTPException(status_code=404, detail="Workspace not found")

    profile = get_or_create_company_profile(db)
    rag = RagEngine()
    analyzer = LlmAnalyzer()

    updated_sections = []
    found = False
    for sec in ws.memoire_sections or []:
        if sec.get("id") == section_id:
            found = True
            rag_hits = rag.retrieve_knowledge_chunks(
                db, f"{sec.get('title', '')} {sec.get('cctp_requirement', '')}", top_k=5
            )
            draft_res = analyzer.draft_memoire_section(
                sec.get("title", "Section"),
                sec.get("cctp_requirement", ""),
                profile,
                rag_hits,
            )
            sec = {
                **sec,
                "draft_markdown": draft_res["draft_markdown"],
                "citations": draft_res["citations"],
            }
        updated_sections.append(sec)

    if not found:
        raise HTTPException(status_code=404, detail="Section not found")

    ws.memoire_sections = updated_sections
    db.commit()
    db.refresh(ws)
    return ws
