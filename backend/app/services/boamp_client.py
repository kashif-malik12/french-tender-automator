from __future__ import annotations

import logging
from datetime import datetime, timezone
from typing import Any

import httpx

from app.config import get_settings

logger = logging.getLogger(__name__)

DILA_ATTRIBUTION = "source: DILA - BOAMP, Licence Ouverte 2.0"


def _as_list(value: Any) -> list[str]:
    if value is None:
        return []
    if isinstance(value, list):
        return [str(v).strip() for v in value if str(v).strip()]
    if isinstance(value, str):
        return [v.strip() for v in value.split(",") if v.strip()]
    return [str(value).strip()]


def _parse_dt(value: Any) -> datetime | None:
    if not value:
        return None
    if isinstance(value, datetime):
        return value if value.tzinfo else value.replace(tzinfo=timezone.utc)
    text = str(value).strip()
    try:
        dt = datetime.fromisoformat(text.replace("Z", "+00:00"))
        return dt if dt.tzinfo else dt.replace(tzinfo=timezone.utc)
    except ValueError:
        return None


def _sanitize_odsql(term: str) -> str:
    return term.replace("'", "''").replace('"', "").strip()


class BoampClient:
    """Client for querying DILA BOAMP Open Data v2.1 API."""

    def __init__(self) -> None:
        self.settings = get_settings()

    def build_where_clause(
        self,
        departments: list[str] | None = None,
        cpv_codes: list[str] | None = None,
        keywords: list[str] | None = None,
        procedure_types: list[str] | None = None,
        only_open: bool = True,
    ) -> str:
        clauses: list[str] = []
        if only_open:
            today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
            clauses.append(f"(datelimitereponse >= date'{today}' OR datelimitereponse IS NULL)")

        if departments:
            dept_parts = [f"code_departement='{_sanitize_odsql(d)}'" for d in departments if d.strip()]
            if dept_parts:
                clauses.append(f"({' OR '.join(dept_parts)})")

        if cpv_codes:
            cpv_parts = [
                f"search(dc, '{_sanitize_odsql(c[:6])}')"
                for c in cpv_codes
                if c.strip()
            ]
            if cpv_parts:
                clauses.append(f"({' OR '.join(cpv_parts)})")

        if keywords:
            kw_parts = [
                f"search(objet, '{_sanitize_odsql(k)}')"
                for k in keywords
                if k.strip()
            ]
            if kw_parts:
                clauses.append(f"({' OR '.join(kw_parts)})")

        if procedure_types:
            proc_parts = [
                f"search(type_procedure, '{_sanitize_odsql(p)}')"
                for p in procedure_types
                if p.strip()
            ]
            if proc_parts:
                clauses.append(f"({' OR '.join(proc_parts)})")

        return " AND ".join(clauses)

    def fetch_tenders(
        self,
        departments: list[str] | None = None,
        cpv_codes: list[str] | None = None,
        keywords: list[str] | None = None,
        procedure_types: list[str] | None = None,
        limit: int = 25,
    ) -> list[dict[str, Any]]:
        """Query BOAMP Open Data v2.1 and return normalized tender dictionaries."""
        where_clause = self.build_where_clause(
            departments=departments,
            cpv_codes=cpv_codes,
            keywords=keywords,
            procedure_types=procedure_types,
            only_open=True,
        )

        params: dict[str, Any] = {
            "limit": max(1, min(limit, 100)),
            "order_by": "dateparution desc",
        }
        if where_clause:
            params["where"] = where_clause

        logger.info("Fetching BOAMP tenders (where=%s, limit=%s)", where_clause, params["limit"])
        with httpx.Client(timeout=20.0) as client:
            response = client.get(self.settings.boamp_api_url, params=params)
            if response.status_code == 400 and where_clause:
                # Fallback if ODSQL query on optional fields fails for any custom token
                logger.warning("BOAMP strict filter failed (%s); retrying with keyword/date fallback", response.text)
                fallback_where = self.build_where_clause(departments=departments, only_open=True)
                fallback_params = {"limit": params["limit"], "order_by": "dateparution desc"}
                if fallback_where:
                    fallback_params["where"] = fallback_where
                response = client.get(self.settings.boamp_api_url, params=fallback_params)
            response.raise_for_status()
            payload = response.json()

        results = payload.get("results", [])
        return [self.normalize_record(rec) for rec in results if rec.get("idweb")]

    def normalize_record(self, rec: dict[str, Any]) -> dict[str, Any]:
        boamp_id = str(rec.get("idweb") or "").strip()
        depts = _as_list(rec.get("code_departement"))
        department = depts[0] if depts else None
        cpv_codes = _as_list(rec.get("dc"))
        title = str(rec.get("objet") or f"Avis BOAMP {boamp_id}").strip()
        buyer_name = str(rec.get("nomacheteur") or "").strip() or None
        procedure_type = str(rec.get("type_procedure") or rec.get("procedure_libelle") or "").strip() or None
        boamp_url = rec.get("url_avis") or (
            f"https://www.boamp.fr/pages/avis/?q=idweb:{boamp_id}" if boamp_id else None
        )
        descripteur = ", ".join(_as_list(rec.get("descripteur_libelle")))
        description = str(rec.get("donnees") or descripteur or title)[:4000]

        return {
            "boamp_id": boamp_id,
            "title": title[:512],
            "buyer_name": buyer_name[:255] if buyer_name else None,
            "department": department[:16] if department else None,
            "cpv_codes": cpv_codes,
            "procedure_type": procedure_type[:128] if procedure_type else None,
            "publication_date": _parse_dt(rec.get("dateparution")),
            "deadline_date": _parse_dt(rec.get("datelimitereponse")),
            "boamp_url": boamp_url[:512] if boamp_url else None,
            "description": description,
            "raw_payload": rec,
            "attribution": DILA_ATTRIBUTION,
        }
