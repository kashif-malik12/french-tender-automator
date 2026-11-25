from __future__ import annotations

import logging
import re
from datetime import datetime, timedelta, timezone
from typing import Any

import httpx

from app.config import get_settings

logger = logging.getLogger(__name__)

TED_ATTRIBUTION = "source: Publications Office of the European Union — TED (europa.eu)"

TED_FIELDS = [
    "publication-number",
    "notice-title",
    "title-proc",
    "buyer-name",
    "buyer-country",
    "place-of-performance-country-proc",
    "deadline-receipt-tender-date-lot",
    "deadline-date-lot",
    "estimated-value-proc",
    "estimated-value-cur-proc",
    "estimated-value-lot",
    "estimated-value-cur-lot",
    "framework-maximum-value-lot",
    "framework-maximum-value-cur-lot",
    "classification-cpv",
    "procedure-type",
    "publication-date",
    "description-proc",
    "description-lot",
]


def _pick_lang_value(val: Any) -> str:
    """Pick French or English text from a TED multilingual field dict/list/string."""
    if val is None:
        return ""
    if isinstance(val, str):
        return val.strip()
    if isinstance(val, list):
        for item in val:
            picked = _pick_lang_value(item)
            if picked:
                return picked
        return ""
    if isinstance(val, dict):
        for lang in ("fra", "eng", "deu", "spa", "ita", "nld", "por"):
            if lang in val and val[lang]:
                return _pick_lang_value(val[lang])
        for v in val.values():
            picked = _pick_lang_value(v)
            if picked:
                return picked
    return ""


def _parse_ted_dt(val: Any) -> datetime | None:
    if not val:
        return None
    if isinstance(val, list):
        # Pick the earliest future/valid deadline or first item
        parsed = [_parse_ted_dt(item) for item in val]
        valid = [dt for dt in parsed if dt is not None]
        return min(valid) if valid else None
    text = str(val).strip()
    if not text:
        return None
    # Handle formats like "2026-12-18+01:00" or "2026-12-22Z" or "2026-12-18T12:00:00Z"
    try:
        if "T" in text:
            return datetime.fromisoformat(text.replace("Z", "+00:00"))
        m = re.match(r"^(\d{4}-\d{2}-\d{2})(.*)$", text)
        if m:
            date_part = m.group(1)
            tz_part = m.group(2).strip()
            dt = datetime.fromisoformat(date_part)
            if tz_part == "Z" or not tz_part:
                return dt.replace(tzinfo=timezone.utc)
            dt_full = datetime.fromisoformat(f"{date_part}T17:00:00{tz_part}")
            return dt_full.astimezone(timezone.utc)
    except ValueError:
        return None
    return None


def _parse_ted_amount(rec: dict[str, Any]) -> tuple[float | None, str]:
    cur_raw = rec.get("estimated-value-cur-proc") or rec.get("estimated-value-cur-lot") or rec.get("framework-maximum-value-cur-lot")
    currency = "EUR"
    if isinstance(cur_raw, list) and cur_raw:
        currency = str(cur_raw[0])[:8]
    elif isinstance(cur_raw, str) and cur_raw.strip():
        currency = cur_raw.strip()[:8]

    for key in ("estimated-value-proc", "framework-maximum-value-lot", "estimated-value-lot"):
        raw = rec.get(key)
        if raw is None:
            continue
        vals = raw if isinstance(raw, list) else [raw]
        nums: list[float] = []
        for item in vals:
            try:
                num = float(str(item).replace(" ", "").replace(",", "."))
                if num > 0:
                    nums.append(num)
            except (TypeError, ValueError):
                continue
        if nums:
            return max(nums), currency
    return None, currency


class TedClient:
    """Client for querying EU Tenders Electronic Daily (TED) API v3."""

    def __init__(self) -> None:
        self.settings = get_settings()

    def build_cpv_query(self, cpv_codes: list[str] | None = None) -> str:
        prefixes: list[str] = []
        for c in cpv_codes or ["72000000", "48000000"]:
            digits = re.sub(r"\D", "", c)
            if len(digits) >= 2:
                # Use 2-digit CPV wildcard like 72* or 48* (e.g. 72000000 -> 72*)
                prefix = digits[:2] if digits.endswith("000000") else digits[:4]
                token = f"{prefix}*"
                if token not in prefixes:
                    prefixes.append(token)
        if not prefixes:
            prefixes = ["72*", "48*"]
        return f"classification-cpv = ({' OR '.join(prefixes)})"

    def fetch_tenders(
        self,
        cpv_codes: list[str] | None = None,
        limit: int = 25,
        country_filter: str | None = None,
    ) -> list[dict[str, Any]]:
        """Fetch active EU IT contract notices from TED API v3."""
        if limit <= 0:
            return []

        now = datetime.now(timezone.utc)
        today_str = now.strftime("%Y%m%d")
        since_str = (now - timedelta(days=45)).strftime("%Y%m%d")

        cpv_expr = self.build_cpv_query(cpv_codes)
        query_parts = [
            cpv_expr,
            "notice-type = (cn-standard OR cn-social)",
            f"publication-date >= {since_str}",
            f"deadline-receipt-tender-date-lot >= {today_str}",
        ]
        if country_filter == "FRA":
            query_parts.append("(place-of-performance-country-proc = FRA OR buyer-country = FRA)")
        elif country_filter == "EU_NON_FR":
            query_parts.append("place-of-performance-country-proc != FRA AND buyer-country != FRA")

        payload = {
            "query": " AND ".join(query_parts),
            "fields": TED_FIELDS,
            "page": 1,
            "limit": max(1, min(limit, 100)),
        }

        logger.info("Fetching TED notices (query=%s, limit=%s)", payload["query"], payload["limit"])
        with httpx.Client(timeout=25.0) as client:
            resp = client.post(self.settings.ted_api_url, json=payload)
            resp.raise_for_status()
            data = resp.json()

        notices = data.get("notices", [])
        return [self.normalize_record(n) for n in notices if n.get("publication-number")]

    def normalize_record(self, rec: dict[str, Any]) -> dict[str, Any]:
        pub_num = str(rec.get("publication-number") or "").strip()
        boamp_id = f"TED:{pub_num}"

        countries = rec.get("place-of-performance-country-proc") or rec.get("buyer-country") or []
        country = str(countries[0] if isinstance(countries, list) and countries else countries or "EUR")[:8].upper()
        region = "FR" if country == "FRA" else "EU"

        title = (
            _pick_lang_value(rec.get("title-proc"))
            or _pick_lang_value(rec.get("notice-title"))
            or f"Avis TED {pub_num}"
        )
        buyer_name = _pick_lang_value(rec.get("buyer-name")) or None

        cpvs_raw = rec.get("classification-cpv") or []
        cpv_codes = list(dict.fromkeys(str(c).strip() for c in cpvs_raw if str(c).strip()))[:20]

        proc_type = rec.get("procedure-type")
        if isinstance(proc_type, list):
            proc_type = ", ".join(str(p) for p in proc_type)

        desc_proc = _pick_lang_value(rec.get("description-proc"))
        desc_lot = _pick_lang_value(rec.get("description-lot"))
        description = (desc_proc or desc_lot or title)[:4000]

        estimated_amount, currency = _parse_ted_amount(rec)
        ted_url = f"https://ted.europa.eu/fr/notice/-/detail/{pub_num}" if pub_num else None

        return {
            "boamp_id": boamp_id,
            "source": "TED",
            "region": region,
            "country": country,
            "title": title[:512],
            "buyer_name": buyer_name[:255] if buyer_name else None,
            "department": country if region == "EU" else "FR-EU",
            "cpv_codes": cpv_codes,
            "procedure_type": str(proc_type)[:128] if proc_type else None,
            "publication_date": _parse_ted_dt(rec.get("publication-date")),
            "deadline_date": _parse_ted_dt(
                rec.get("deadline-receipt-tender-date-lot") or rec.get("deadline-date-lot")
            ),
            "estimated_amount": estimated_amount,
            "currency": currency,
            "boamp_url": ted_url[:512] if ted_url else None,
            "description": description,
            "raw_payload": rec,
            "attribution": TED_ATTRIBUTION,
        }
