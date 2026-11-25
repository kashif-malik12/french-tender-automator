from __future__ import annotations

import logging

from fastapi import FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import dce_upload, export, knowledge_base, tenders
from app.auth import create_access_token, verify_credentials
from app.config import get_settings
from app.database import check_db_health
from app.schemas import LoginRequest, LoginResponse

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)

settings = get_settings()

app = FastAPI(
    title="French Tender Automator API",
    version="1.0.0",
    description="Veille BOAMP, analyse DCE et génération assistée de mémoires techniques (human-in-the-loop).",
    docs_url="/api/docs",
    openapi_url="/api/openapi.json",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/health")
def health_check() -> dict:
    db_ok = False
    try:
        db_ok = check_db_health()
    except Exception:
        db_ok = False
    return {
        "status": "ok" if db_ok else "degraded",
        "database": db_ok,
        "llm_provider": settings.llm_provider,
    }


@app.post("/api/auth/login", response_model=LoginResponse)
def login(payload: LoginRequest) -> LoginResponse:
    if not verify_credentials(payload.username, payload.password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Identifiants invalides",
        )
    token = create_access_token(payload.username)
    return LoginResponse(access_token=token, username=payload.username)


app.include_router(tenders.router, prefix="/api")
app.include_router(knowledge_base.router, prefix="/api")
app.include_router(dce_upload.router, prefix="/api")
app.include_router(export.router, prefix="/api")
