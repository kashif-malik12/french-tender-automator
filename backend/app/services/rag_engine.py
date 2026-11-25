from __future__ import annotations

import hashlib
import logging
import math
import re
from typing import Any

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.config import get_settings
from app.models.db_models import DocumentChunk, KnowledgeDocument, TenderWorkspace
from app.services.dce_parser import ParsedDocument, chunk_text

logger = logging.getLogger(__name__)


def _normalize_vector(vec: list[float], target_dim: int) -> list[float]:
    if len(vec) < target_dim:
        vec = vec + [0.0] * (target_dim - len(vec))
    elif len(vec) > target_dim:
        vec = vec[:target_dim]
    norm = math.sqrt(sum(v * v for v in vec))
    if norm > 0:
        return [v / norm for v in vec]
    return vec


def _deterministic_fallback_embedding(text: str, dim: int) -> list[float]:
    """Generate a deterministic normalized hash embedding when external embedding APIs are absent."""
    vec = [0.0] * dim
    tokens = re.findall(r"[a-zàâäéèêëïîôöùûüç0-9]{2,}", text.lower())
    if not tokens:
        vec[0] = 1.0
        return vec
    for tok in tokens:
        digest = hashlib.blake2b(tok.encode("utf-8"), digest_size=8).digest()
        idx = int.from_bytes(digest[:4], "big") % dim
        sign = 1.0 if (digest[4] % 2 == 0) else -1.0
        vec[idx] += sign
    return _normalize_vector(vec, dim)


class RagEngine:
    """Vector indexing and semantic retrieval backed by PostgreSQL pgvector."""

    def __init__(self) -> None:
        self.settings = get_settings()

    def embed_texts(self, texts: list[str]) -> list[list[float]]:
        if not texts:
            return []

        provider = self.settings.llm_provider.lower()
        dim = self.settings.embedding_dim

        if provider == "openai" and self.settings.openai_api_key:
            try:
                from openai import OpenAI

                client = OpenAI(api_key=self.settings.openai_api_key)
                resp = client.embeddings.create(
                    model=self.settings.embedding_model,
                    input=[t[:8000] for t in texts],
                )
                return [_normalize_vector(item.embedding, dim) for item in resp.data]
            except Exception as exc:
                logger.warning("OpenAI embedding error (%s); falling back to local hash embeddings.", exc)

        if provider == "gemini" and self.settings.gemini_api_key:
            try:
                from google import genai

                client = genai.Client(api_key=self.settings.gemini_api_key)
                vectors: list[list[float]] = []
                for t in texts:
                    resp = client.models.embed_content(
                        model=self.settings.gemini_embedding_model,
                        contents=t[:8000],
                    )
                    values = list(resp.embeddings[0].values)
                    vectors.append(_normalize_vector(values, dim))
                return vectors
            except Exception as exc:
                logger.warning("Gemini embedding error (%s); falling back to local hash embeddings.", exc)

        return [_deterministic_fallback_embedding(t, dim) for t in texts]

    def index_knowledge_document(
        self,
        db: Session,
        kb_doc: KnowledgeDocument,
        extracted_text: str,
    ) -> int:
        chunks = chunk_text(extracted_text, chunk_size=1100, overlap=180)
        if not chunks:
            return 0

        embeddings = self.embed_texts(chunks)
        for idx, (chunk_str, vec) in enumerate(zip(chunks, embeddings)):
            db.add(
                DocumentChunk(
                    knowledge_document_id=kb_doc.id,
                    source_type="knowledge_base",
                    category=kb_doc.category,
                    document_role="KB",
                    chunk_index=idx,
                    content=chunk_str,
                    metadata_json={
                        "document_title": kb_doc.title,
                        "filename": kb_doc.filename,
                        "category": kb_doc.category,
                    },
                    embedding=vec,
                )
            )
        kb_doc.chunk_count = len(chunks)
        db.commit()
        return len(chunks)

    def index_dce_documents(
        self,
        db: Session,
        workspace: TenderWorkspace,
        parsed_docs: list[ParsedDocument],
    ) -> int:
        total = 0
        for doc in parsed_docs:
            chunks = chunk_text(doc.text, chunk_size=1200, overlap=200)
            if not chunks:
                continue
            embeddings = self.embed_texts(chunks)
            for idx, (chunk_str, vec) in enumerate(zip(chunks, embeddings)):
                db.add(
                    DocumentChunk(
                        tender_workspace_id=workspace.id,
                        source_type="dce",
                        category=doc.role,
                        document_role=doc.role,
                        chunk_index=idx,
                        content=chunk_str,
                        metadata_json={
                            "filename": doc.filename,
                            "role": doc.role,
                        },
                        embedding=vec,
                    )
                )
                total += 1
        db.commit()
        return total

    def retrieve_knowledge_chunks(
        self,
        db: Session,
        query: str,
        top_k: int = 5,
        category: str | None = None,
    ) -> list[dict[str, Any]]:
        query_vec = self.embed_texts([query])[0]
        distance_col = DocumentChunk.embedding.cosine_distance(query_vec).label("distance")

        stmt = (
            select(DocumentChunk, distance_col)
            .where(DocumentChunk.source_type == "knowledge_base")
            .order_by(distance_col.asc())
            .limit(top_k)
        )
        if category:
            stmt = stmt.where(DocumentChunk.category == category)

        rows = db.execute(stmt).all()
        results: list[dict[str, Any]] = []
        for chunk, distance in rows:
            similarity = max(0.0, min(1.0, 1.0 - float(distance)))
            results.append(
                {
                    "chunk_id": chunk.id,
                    "document_title": chunk.metadata_json.get("document_title", "Base interne"),
                    "filename": chunk.metadata_json.get("filename", ""),
                    "category": chunk.category,
                    "similarity": round(similarity, 3),
                    "content": chunk.content,
                }
            )
        return results
