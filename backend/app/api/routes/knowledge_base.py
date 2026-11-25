from __future__ import annotations

import uuid
from pathlib import Path

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from sqlalchemy import desc, select
from sqlalchemy.orm import Session

from app.auth import require_auth
from app.config import get_settings
from app.database import get_db
from app.models.db_models import KnowledgeDocument
from app.schemas import KnowledgeDocumentOut, KnowledgeSearchRequest
from app.services.dce_parser import extract_text_from_file
from app.services.rag_engine import RagEngine

router = APIRouter(prefix="/knowledge-base", tags=["knowledge-base"], dependencies=[Depends(require_auth)])

ALLOWED_CATEGORIES = {"methodology", "team", "equipment", "references", "rse_environment"}


@router.get("", response_model=list[KnowledgeDocumentOut])
def list_knowledge_documents(
    category: str | None = None,
    db: Session = Depends(get_db),
) -> list[KnowledgeDocument]:
    stmt = select(KnowledgeDocument).order_by(desc(KnowledgeDocument.created_at))
    if category:
        stmt = stmt.where(KnowledgeDocument.category == category)
    return list(db.execute(stmt).scalars().all())


@router.post("/upload", response_model=KnowledgeDocumentOut)
async def upload_knowledge_document(
    file: UploadFile = File(...),
    title: str = Form(""),
    category: str = Form("methodology"),
    db: Session = Depends(get_db),
) -> KnowledgeDocument:
    if category not in ALLOWED_CATEGORIES:
        raise HTTPException(
            status_code=400,
            detail=f"Catégorie invalide. Valeurs autorisées : {', '.join(sorted(ALLOWED_CATEGORIES))}",
        )

    settings = get_settings()
    safe_name = Path(file.filename or "document.txt").name
    suffix = Path(safe_name).suffix.lower() or ".txt"
    unique_name = f"{uuid.uuid4().hex}_{safe_name}"
    dest_path = settings.kb_dir / unique_name

    content_bytes = await file.read()
    dest_path.write_bytes(content_bytes)

    extracted_text, note = extract_text_from_file(dest_path)
    if not extracted_text:
        extracted_text = f"Document: {title or safe_name}. {note}".strip()

    kb_doc = KnowledgeDocument(
        title=(title.strip() or Path(safe_name).stem)[:255],
        category=category,
        filename=safe_name[:255],
        storage_path=str(dest_path),
        file_type=suffix.lstrip("."),
        file_size=len(content_bytes),
        chunk_count=0,
    )
    db.add(kb_doc)
    db.commit()
    db.refresh(kb_doc)

    rag = RagEngine()
    rag.index_knowledge_document(db, kb_doc, extracted_text)
    db.refresh(kb_doc)
    return kb_doc


@router.post("/search")
def search_knowledge_base(
    payload: KnowledgeSearchRequest,
    db: Session = Depends(get_db),
) -> dict:
    rag = RagEngine()
    results = rag.retrieve_knowledge_chunks(
        db=db,
        query=payload.query,
        top_k=payload.top_k,
        category=payload.category,
    )
    return {"query": payload.query, "results": results}


@router.delete("/{doc_id}")
def delete_knowledge_document(
    doc_id: int,
    db: Session = Depends(get_db),
) -> dict:
    doc = db.get(KnowledgeDocument, doc_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Knowledge document not found")

    file_path = Path(doc.storage_path)
    if file_path.exists() and file_path.is_file():
        file_path.unlink(missing_ok=True)

    db.delete(doc)
    db.commit()
    return {"deleted": True, "id": doc_id}
