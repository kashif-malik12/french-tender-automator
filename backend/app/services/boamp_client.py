from __future__ import annotations

import json
import logging
import re
from datetime import datetime, timezone
from typing import Any

import httpx

from app.config import get_settings

logger = logging.getLogger(__name__)

DILA_ATTRIBUTION = "source: DILA - BOAMP, Licence Ouverte 2.0"

# Mapping from CPV 2-digit divisions to BOAMP descripteur_libelle terms
CPV_TO_BOAMP_DESCRIPTORS: dict[str, list[str]] = {
    "72": ["Informatique", "Logiciel"],
    "48": ["Logiciel", "Informatique"],
    "30": ["Informatique (matériel)"],
    "64": ["Télécommunications"],
}


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
    # Opendatasoft ODSQL full-text search() breaks on unescaped single quotes
    return term.replace("'", " ").replace('"', " ").strip()


def _extract_cpvs_from_donnees(donnees_obj: Any) -> list[str]:
    """Recursively extract 8-digit CPV codes from BOAMP EFORMS/FNSimple JSON."""
    cpvs: list[str] = []

    def _walk(node: Any) -> None:
        if isinstance(node, dict):
            if node.get("@listName") == "cpv" and "#text" in node:
                val = str(node["#text"]).strip()
                if re.fullmatch(r"\d{8}", val) and val not in cpvs:
                    cpvs.append(val)
            for k, v in node.items():
                if k in {"classPrincipale", "classComplementaire"} and isinstance(v, str):
                    val = v.strip()
                    if re.fullmatch(r"\d{8}", val) and val not in cpvs:
                        cpvs.append(val)
                elif k in {"PRINCIPAL", "COMPLEMENTAIRE"} and isinstance(v, str):
                    val = v.strip()
                    if re.fullmatch(r"\d{8}", val) and val not in cpvs:
                        cpvs.append(val)
                else:
                    _walk(v)
        elif isinstance(node, list):
            for item in node:
                _walk(item)

    _walk(donnees_obj)
    return cpvs


def _extract_amount_from_donnees(donnees_obj: Any, fallback_text: str = "") -> tuple[float | None, str]:
    """Extract estimated contract amount & currency from BOAMP donnees JSON or text."""
    amount_keys = {
        "cbc:EstimatedOverallContractAmount",
        "efbc:FrameworkMaximumAmount",
        "efbc:OverallMaximumFrameworkContractsAmount",
        "cbc:MaximumValueAmount",
        "VALEUR_ESTIMEE",
        "VALEUR_TOTALE",
        "MONTANT_ESTIME",
    }
    found: list[tuple[float, str]] = []

    def _walk(node: Any) -> None:
        if isinstance(node, dict):
            for k, v in node.items():
                if k in amount_keys:
                    raw_val = v.get("#text") if isinstance(v, dict) else v
                    cur = v.get("@currencyID", "EUR") if isinstance(v, dict) else "EUR"
                    try:
                        num = float(str(raw_val).replace(" ", "").replace(",", "."))
                        if num > 0:
                            found.append((num, str(cur or "EUR")[:8]))
                    except (TypeError, ValueError):
                        pass
                else:
                    _walk(v)
        elif isinstance(node, list):
            for item in node:
                _walk(item)

    _walk(donnees_obj)
    if found:
        return found[0]

    # Fallback regex in description text (e.g. "350 000 euro(s) HT" or "120 000 €")
    if fallback_text:
        m = re.search(
            r"(?:montant\s+(?:estim[ée]|maximum|max|global)|valeur\s+estim[ée]e|budget)[^\d]{0,35}(\d[\d\s\u00a0]{2,12}(?:[.,]\d{1,2})?)\s*(?:€|eur|euros?)",
            fallback_text,
            flags=re.IGNORECASE,
        )
        if not m:
            m = re.search(
                r"(\d{2,3}(?:[\s\u00a0]\d{3})+)\s*(?:€|euros?\s*(?:HT|TTC)?)",
                fallback_text,
                flags=re.IGNORECASE,
            )
        if m:
            try:
                num = float(m.group(1).replace("\u00a0", "").replace(" ", "").replace(",", "."))
                if num >= 1000:
                    return num, "EUR"
            except ValueError:
                pass

    return None, "EUR"


def _extract_readable_description(donnees_obj: Any) -> str:
    """Extract human-readable tender description strings from BOAMP JSON."""
    parts: list[str] = []

    def _walk(node: Any) -> None:
        if isinstance(node, dict):
            for k, v in node.items():
                if k in {"cbc:Description", "objetComplet", "OBJET_COMPLET"}:
                    text = v.get("#text") if isinstance(v, dict) else v
                    if isinstance(text, str) and len(text.strip()) > 15:
                        cleaned = text.strip()
                        if cleaned not in parts:
                            parts.append(cleaned)
                else:
                    _walk(v)
        elif isinstance(node, list):
            for item in node:
                _walk(item)

    _walk(donnees_obj)
    return "\n\n".join(parts)


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
        include_all_france: bool = True,
    ) -> str:
        clauses: list[str] = []
        if only_open:
            today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
            clauses.append("nature='APPEL_OFFRE'")
            clauses.append(f"datelimitereponse >= date'{today}'")

        if departments and not include_all_france:
            dept_parts = [f"code_departement='{_sanitize_odsql(d)}'" for d in departments if d.strip()]
            if dept_parts:
                clauses.append(f"({' OR '.join(dept_parts)})")

        # Combine CPV descriptor / donnees CPV / keyword filters as an OR relevance group
        relevance_parts: list[str] = []
        if cpv_codes:
            seen_desc: set[str] = set()
            for c in cpv_codes:
                clean = re.sub(r"\D", "", c)
                if len(clean) >= 2:
                    prefix = clean[:4] if not clean.endswith("000000") else clean[:2]
                    if len(prefix) >= 3:
                        relevance_parts.append(f"search(donnees, '{prefix}')")
                    for desc_kw in CPV_TO_BOAMP_DESCRIPTORS.get(clean[:2], []):
                        if desc_kw not in seen_desc:
                            seen_desc.add(desc_kw)
                            relevance_parts.append(
                                f"search(descripteur_libelle, '{_sanitize_odsql(desc_kw)}')"
                            )

        if keywords:
            for k in keywords[:12]:
                if k.strip():
                    relevance_parts.append(f"search(objet, '{_sanitize_odsql(k)}')")

        if relevance_parts:
            clauses.append(f"({' OR '.join(relevance_parts)})")

        if procedure_types:
            proc_parts = [
                f"(type_procedure='{_sanitize_odsql(p)}' OR search(procedure_libelle, '{_sanitize_odsql(p)}'))"
                for p in procedure_types
                if p.strip()
            ]
            if proc_parts:
                clauses.append(f"({' OR '.join(proc_parts)})")

        return " AND ".join(clauses)

    def _query_boamp(self, where_clause: str, limit: int, fallback_where: str = "") -> list[dict[str, Any]]:
        params: dict[str, Any] = {
            "limit": max(1, min(limit, 100)),
            "order_by": "dateparution desc",
        }
        if where_clause:
            params["where"] = where_clause

        logger.info("Fetching BOAMP tenders (where=%s, limit=%s)", where_clause, params["limit"])
        with httpx.Client(timeout=20.0) as client:
            response = client.get(self.settings.boamp_api_url, params=params)
            if response.status_code == 400 and fallback_where:
                logger.warning("BOAMP strict filter failed (%s); retrying with fallback", response.text)
                fb_params = {"limit": params["limit"], "order_by": "dateparution desc", "where": fallback_where}
                response = client.get(self.settings.boamp_api_url, params=fb_params)
            response.raise_for_status()
            payload = response.json()
        return payload.get("results", [])

    def fetch_tenders(
        self,
        departments: list[str] | None = None,
        cpv_codes: list[str] | None = None,
        keywords: list[str] | None = None,
        procedure_types: list[str] | None = None,
        limit: int = 30,
        include_all_france: bool = True,
    ) -> list[dict[str, Any]]:
        """Query BOAMP Open Data v2.1 prioritizing local IDF MAPA (<90k) tenders plus broader IT pool."""
        merged_by_id: dict[str, dict[str, Any]] = {}

        # Pass 1: Local Essonne/IDF MAPA (Procédure Adaptée) & IDF local IT lots first
        if departments:
            mapa_where = self.build_where_clause(
                departments=departments,
                cpv_codes=cpv_codes,
                keywords=keywords,
                procedure_types=procedure_types or ["PROCEDURE_ADAPTE", "Adaptée"],
                only_open=True,
                include_all_france=False,
            )
            mapa_fb = self.build_where_clause(
                departments=departments,
                cpv_codes=cpv_codes,
                only_open=True,
                include_all_france=False,
            )
            for rec in self._query_boamp(mapa_where, limit=min(50, max(limit, 30)), fallback_where=mapa_fb):
                idweb = str(rec.get("idweb") or "").strip()
                if idweb:
                    merged_by_id[idweb] = rec

            # Also pull all open IDF IT lots (including >90k for sous-traitance / co-traitance)
            idf_where = self.build_where_clause(
                departments=departments,
                cpv_codes=cpv_codes,
                keywords=keywords,
                procedure_types=procedure_types,
                only_open=True,
                include_all_france=False,
            )
            idf_fb = self.build_where_clause(
                departments=departments,
                cpv_codes=cpv_codes,
                only_open=True,
                include_all_france=False,
            )
            for rec in self._query_boamp(idf_where, limit=min(50, max(limit, 30)), fallback_where=idf_fb):
                idweb = str(rec.get("idweb") or "").strip()
                if idweb and idweb not in merged_by_id:
                    merged_by_id[idweb] = rec

        # Pass 2: Broader France pool if include_all_france is enabled
        if include_all_france:
            where_clause = self.build_where_clause(
                departments=departments,
                cpv_codes=cpv_codes,
                keywords=keywords,
                procedure_types=procedure_types,
                only_open=True,
                include_all_france=True,
            )
            fallback_where = self.build_where_clause(
                departments=departments,
                cpv_codes=cpv_codes,
                only_open=True,
                include_all_france=True,
            )
            for rec in self._query_boamp(where_clause, limit=limit, fallback_where=fallback_where):
                idweb = str(rec.get("idweb") or "").strip()
                if idweb and idweb not in merged_by_id:
                    merged_by_id[idweb] = rec

        return [self.normalize_record(rec) for rec in merged_by_id.values()]

    def normalize_record(self, rec: dict[str, Any]) -> dict[str, Any]:
        boamp_id = str(rec.get("idweb") or "").strip()
        depts = _as_list(rec.get("code_departement"))
        # Prefer Essonne (91) or priority IDF department when notice spans multiple departments
        department = None
        for prio_dept in ("91", "94", "77", "92", "75", "78", "93", "95"):
            if prio_dept in depts:
                department = prio_dept
                break
        if department is None:
            department = depts[0] if depts else None
        title = str(rec.get("objet") or f"Avis BOAMP {boamp_id}").strip()
        buyer_name = str(rec.get("nomacheteur") or "").strip() or None
        procedure_type = str(rec.get("procedure_libelle") or rec.get("type_procedure") or "").strip() or None
        boamp_url = rec.get("url_avis") or (
            f"https://www.boamp.fr/pages/avis/?q=idweb:{boamp_id}" if boamp_id else None
        )

        donnees_raw = rec.get("donnees")
        donnees_obj: dict[str, Any] = {}
        if isinstance(donnees_raw, dict):
            donnees_obj = donnees_raw
        elif isinstance(donnees_raw, str) and donnees_raw.strip().startswith("{"):
            try:
                donnees_obj = json.loads(donnees_raw)
            except json.JSONDecodeError:
                donnees_obj = {}

        extracted_cpvs = _extract_cpvs_from_donnees(donnees_obj)
        raw_dc = _as_list(rec.get("dc"))
        # Prefer 8-digit CPVs extracted from donnees; fall back to dc only if it looks like CPV
        cpv_codes = extracted_cpvs or [c for c in raw_dc if len(c) >= 6] or raw_dc

        readable_desc = _extract_readable_description(donnees_obj)
        descripteur = ", ".join(_as_list(rec.get("descripteur_libelle")))
        description = (readable_desc or descripteur or title)[:4000]

        estimated_amount, currency = _extract_amount_from_donnees(
            donnees_obj,
            fallback_text=f"{title}\n{description}",
        )

        return {
            "boamp_id": boamp_id,
            "source": "BOAMP",
            "region": "FR",
            "country": "FRA",
            "title": title[:512],
            "buyer_name": buyer_name[:255] if buyer_name else None,
            "department": department[:16] if department else None,
            "cpv_codes": cpv_codes,
            "procedure_type": procedure_type[:128] if procedure_type else None,
            "publication_date": _parse_dt(rec.get("dateparution")),
            "deadline_date": _parse_dt(rec.get("datelimitereponse")),
            "estimated_amount": estimated_amount,
            "currency": currency,
            "boamp_url": boamp_url[:512] if boamp_url else None,
            "description": description,
            "raw_payload": rec,
            "attribution": DILA_ATTRIBUTION,
        }
