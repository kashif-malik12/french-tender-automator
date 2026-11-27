# French Tender Automator (`tenders.tradister.com`) — Product Summary

**Repo:** `/home/deploy/projects/french-tender-automator/`  
**Live URL:** `https://tenders.tradister.com` (`127.0.0.1:8098`)

---

## 1. Project Summary
Private AI tender-intelligence and bid-drafting workstation for **TRADISTER SASU** (Track A cashflow engine), monitoring French **BOAMP** and European **TED** IT/Cloud/M365 procurement notices, scoring relevance (`0–100`), analyzing DCE files, and exporting `.docx` Mémoires Techniques.

## 2. Technical Summary
- **Docker Stack:** `frontend` (Next.js `:3000`), `backend` (FastAPI `:8000`), `worker` (Celery), `db` (`pgvector/pgvector:pg16`), `redis` (`redis:7-alpine`), `caddy` (`127.0.0.1:8098->80`).
- **GitHub & Pages:** `git@github-french-tender:kashif-malik12/french-tender-automator.git` (`main`); `.github/workflows/pages.yml` publishes `docs/` showcase to GitHub Pages.
- **Auth:** `admin` + master password (`JWT` Bearer + Basic Auth via `backend/app/auth.py`; `140` notices in `tender_notices`, `104` scored `>= 50`).
- **Modules:** BOAMP Open Data v2.1 + TED polling, Gemini/heuristic Go/No-Go scorer (`llm_analyzer.py`), DCE `.zip`/`.pdf`/`.docx`/`.xlsx` compliance extractor (`dce_upload.py`), pgvector knowledge base RAG (`knowledge_base.py`), `.docx` exporter (`export.py`). *(Note: if browser JWT expires, refresh `F5` or Logout/Login to restore list view.)*

## 3. Marketing Summary
- **Commercial Role:** High-margin cashflow side-channel (`€15k–€60k` MAPA `< €90k` & subcontracting lots in `91`/South-IDF) while scaling global SaaS.
- **Operating Rule:** Bid selectively **only on top-scored (`>= 65`) IT/M365/AI opportunities** and prime-contractor *co-traitance* rather than spending weeks on low-fit paperwork.
