from __future__ import annotations

import re

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.auth import require_auth
from app.config import get_settings
from app.database import get_db
from app.models.db_models import TenderWorkspace
from app.services.docx_builder import build_memoire_docx
from app.worker import get_or_create_company_profile

router = APIRouter(prefix="/workspaces", tags=["export"], dependencies=[Depends(require_auth)])


@router.post("/{workspace_id}/export-docx")
def export_memoire_docx(
    workspace_id: int,
    db: Session = Depends(get_db),
) -> FileResponse:
    ws = db.get(TenderWorkspace, workspace_id)
    if not ws:
        raise HTTPException(status_code=404, detail="Workspace not found")

    settings = get_settings()
    profile = get_or_create_company_profile(db)
    slug = re.sub(r"[^a-zA-Z0-9_-]+", "_", ws.title).strip("_")[:48] or f"workspace_{ws.id}"
    filename = f"memoire_technique_{ws.id}_{slug}.docx"
    output_path = settings.export_dir / filename

    build_memoire_docx(ws, profile, output_path)
    ws.last_export_path = str(output_path)
    db.commit()

    return FileResponse(
        path=str(output_path),
        media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        filename=filename,
    )
