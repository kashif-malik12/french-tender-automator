#!/usr/bin/env python3
"""Sync open France (BOAMP) and EU (TED) IT tenders for TRADISTER SASU into docs/data/tenders.json."""

from __future__ import annotations

import json
import re
import urllib.parse
import urllib.request
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any

PROFILE: dict[str, Any] = {
    "name": "TRADISTER SASU",
    "siren": "988318945",
    "siret": "98831894500017",
    "tva_number": "FR42988318945",
    "naf_code": "62.02A",
    "address": "11 Rue du Château d'Eau, App 132, 91130 Ris-Orangis, France",
    "target_cpv_codes": ["72000000", "72200000", "72300000", "72500000", "72600000", "48000000"],
    "target_departments": ["91", "75", "92", "93", "94", "77", "78", "95"],
    "target_keywords": [
        "infogérance",
        "cloud",
        "cybersécurité",
        "support informatique",
        "helpdesk",
        "maintenance applicative",
        "TMA",
        "MCO",
        "développement logiciel",
        "systèmes d information",
        "ITSM",
        "managed services",
    ],
    "min_target_amount": 10000,
    "max_target_amount": 500000,
    "min_suitability_score": 50,
}

BOAMP_URL = "https://boamp-datadila.opendatasoft.com/api/explore/v2.1/catalog/datasets/boamp/records"
TED_URL = "https://api.ted.europa.eu/v3/notices/search"

IT_FALLBACK_TERMS = (
    "informatique",
    "logiciel",
    "cloud",
    "infogérance",
    "cybersécurité",
    "cybersecurity",
    "software",
    "managed service",
    "helpdesk",
    "support it",
    "système d'information",
    "application",
    "hébergement",
    "saas",
    "tma",
    "mco",
    "itsm",
)


def parse_dt(value: Any) -> datetime | None:
    if not value:
        return None
    if isinstance(value, list):
        parsed = [parse_dt(v) for v in value]
        valid = [d for d in parsed if d is not None]
        return min(valid) if valid else None
    text = str(value).strip()
    if not text:
        return None
    try:
        if "T" in text:
            dt = datetime.fromisoformat(text.replace("Z", "+00:00"))
            return dt if dt.tzinfo else dt.replace(tzinfo=timezone.utc)
        m = re.match(r"^(\d{4}-\d{2}-\d{2})(.*)$", text)
        if m:
            date_part, tz_part = m.group(1), m.group(2).strip()
            if not tz_part or tz_part == "Z":
                return datetime.fromisoformat(date_part).replace(tzinfo=timezone.utc)
            return datetime.fromisoformat(f"{date_part}T17:00:00{tz_part}").astimezone(timezone.utc)
    except ValueError:
        return None
    return None


def extract_cpvs(donnees_obj: Any) -> list[str]:
    cpvs: list[str] = []

    def walk(node: Any) -> None:
        if isinstance(node, dict):
            if node.get("@listName") == "cpv" and "#text" in node:
                val = str(node["#text"]).strip()
                if re.fullmatch(r"\d{8}", val) and val not in cpvs:
                    cpvs.append(val)
            for k, v in node.items():
                if k in {"classPrincipale", "classComplementaire", "PRINCIPAL", "COMPLEMENTAIRE"} and isinstance(v, str):
                    val = v.strip()
                    if re.fullmatch(r"\d{8}", val) and val not in cpvs:
                        cpvs.append(val)
                else:
                    walk(v)
        elif isinstance(node, list):
            for item in node:
                walk(item)

    walk(donnees_obj)
    return cpvs


def extract_boamp_amount(donnees_obj: Any, fallback_text: str) -> tuple[float | None, str]:
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

    def walk(node: Any) -> None:
        if isinstance(node, dict):
            for k, v in node.items():
                if k in amount_keys:
                    raw = v.get("#text") if isinstance(v, dict) else v
                    cur = v.get("@currencyID", "EUR") if isinstance(v, dict) else "EUR"
                    try:
                        num = float(str(raw).replace(" ", "").replace(",", "."))
                        if num > 0:
                            found.append((num, str(cur or "EUR")[:8]))
                    except (TypeError, ValueError):
                        pass
                else:
                    walk(v)
        elif isinstance(node, list):
            for item in node:
                walk(item)

    walk(donnees_obj)
    if found:
        return found[0]

    m = re.search(
        r"(?:montant\s+(?:estim[ée]|maximum|max|global)|valeur\s+estim[ée]e|budget)[^\d]{0,35}(\d[\d\s\u00a0]{2,12}(?:[.,]\d{1,2})?)\s*(?:€|eur|euros?)",
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


def extract_readable_desc(donnees_obj: Any) -> str:
    parts: list[str] = []

    def walk(node: Any) -> None:
        if isinstance(node, dict):
            for k, v in node.items():
                if k in {"cbc:Description", "objetComplet", "OBJET_COMPLET"}:
                    text = v.get("#text") if isinstance(v, dict) else v
                    if isinstance(text, str) and len(text.strip()) > 15 and text.strip() not in parts:
                        parts.append(text.strip())
                else:
                    walk(v)
        elif isinstance(node, list):
            for item in node:
                walk(item)

    walk(donnees_obj)
    return "\n\n".join(parts)


def pick_lang(val: Any) -> str:
    if val is None:
        return ""
    if isinstance(val, str):
        return val.strip()
    if isinstance(val, list):
        for item in val:
            s = pick_lang(item)
            if s:
                return s
        return ""
    if isinstance(val, dict):
        for lang in ("fra", "eng", "deu", "spa", "ita", "nld", "por"):
            if lang in val and val[lang]:
                return pick_lang(val[lang])
        for v in val.values():
            s = pick_lang(v)
            if s:
                return s
    return ""


def fetch_boamp(limit: int = 200) -> list[dict[str, Any]]:
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    where = (
        f"nature='APPEL_OFFRE' AND datelimitereponse >= date'{today}' AND ("
        "search(descripteur_libelle, 'Informatique') OR search(descripteur_libelle, 'Logiciel') OR "
        "search(donnees, '7220') OR search(donnees, '7230') OR search(donnees, '7250') OR search(donnees, '7260') OR "
        "search(objet, 'infogérance') OR search(objet, 'cloud') OR search(objet, 'cybersécurité') OR "
        "search(objet, 'support informatique') OR search(objet, 'helpdesk') OR search(objet, 'maintenance applicative')"
        ")"
    )
    results: list[dict[str, Any]] = []
    offset = 0
    while len(results) < limit:
        batch = min(100, limit - len(results))
        params = urllib.parse.urlencode(
            {"where": where, "limit": batch, "offset": offset, "order_by": "dateparution desc"}
        )
        with urllib.request.urlopen(f"{BOAMP_URL}?{params}", timeout=25) as r:
            data = json.loads(r.read())
        rows = data.get("results", [])
        if not rows:
            break
        results.extend(rows)
        if len(rows) < batch:
            break
        offset += len(rows)

    out: list[dict[str, Any]] = []
    for rec in results:
        bid = str(rec.get("idweb") or "").strip()
        if not bid:
            continue
        depts = rec.get("code_departement") or []
        dept = str(depts[0]) if isinstance(depts, list) and depts else None
        title = str(rec.get("objet") or f"Avis BOAMP {bid}").strip()
        buyer = str(rec.get("nomacheteur") or "").strip() or None
        proc = str(rec.get("procedure_libelle") or rec.get("type_procedure") or "").strip() or None
        url = rec.get("url_avis") or f"https://www.boamp.fr/pages/avis/?q=idweb:{bid}"
        donnees_raw = rec.get("donnees")
        donnees_obj = {}
        if isinstance(donnees_raw, str) and donnees_raw.strip().startswith("{"):
            try:
                donnees_obj = json.loads(donnees_raw)
            except json.JSONDecodeError:
                donnees_obj = {}
        cpvs = extract_cpvs(donnees_obj)
        desc = extract_readable_desc(donnees_obj) or ", ".join(rec.get("descripteur_libelle") or []) or title
        amt, cur = extract_boamp_amount(donnees_obj, f"{title}\n{desc}")
        out.append(
            {
                "id": bid,
                "source": "BOAMP",
                "region": "FR",
                "country": "FRA",
                "title": title[:300],
                "buyer_name": buyer,
                "department": dept,
                "cpv_codes": cpvs[:8],
                "procedure_type": proc,
                "publication_date": (parse_dt(rec.get("dateparution")) or datetime.now(timezone.utc)).isoformat(),
                "deadline_date": parse_dt(rec.get("datelimitereponse")).isoformat() if parse_dt(rec.get("datelimitereponse")) else None,
                "estimated_amount": amt,
                "currency": cur,
                "url": url,
                "description": desc[:600],
                "attribution": "source: DILA - BOAMP, Licence Ouverte 2.0",
            }
        )
    return out


def fetch_ted(country_filter: str, limit: int = 30) -> list[dict[str, Any]]:
    now = datetime.now(timezone.utc)
    today_str = now.strftime("%Y%m%d")
    since_str = (now - timedelta(days=45)).strftime("%Y%m%d")
    c_clause = (
        "(place-of-performance-country-proc = FRA OR buyer-country = FRA)"
        if country_filter == "FRA"
        else "place-of-performance-country-proc != FRA AND buyer-country != FRA"
    )
    payload = {
        "query": f"classification-cpv = (72* OR 48*) AND notice-type = (cn-standard OR cn-social) AND publication-date >= {since_str} AND deadline-receipt-tender-date-lot >= {today_str} AND {c_clause}",
        "fields": [
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
            "classification-cpv",
            "procedure-type",
            "publication-date",
            "description-proc",
        ],
        "page": 1,
        "limit": limit,
    }
    req = urllib.request.Request(
        TED_URL,
        data=json.dumps(payload).encode(),
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=25) as r:
        data = json.loads(r.read())

    out: list[dict[str, Any]] = []
    for n in data.get("notices", []):
        pub_num = str(n.get("publication-number") or "").strip()
        if not pub_num:
            continue
        countries = n.get("place-of-performance-country-proc") or n.get("buyer-country") or ["EUR"]
        country = str(countries[0] if isinstance(countries, list) else countries)[:8].upper()
        region = "FR" if country == "FRA" else "EU"
        title = pick_lang(n.get("title-proc")) or pick_lang(n.get("notice-title")) or f"Avis TED {pub_num}"
        buyer = pick_lang(n.get("buyer-name")) or None
        cpvs = list(dict.fromkeys(str(c).strip() for c in (n.get("classification-cpv") or []) if str(c).strip()))
        dl = parse_dt(n.get("deadline-receipt-tender-date-lot") or n.get("deadline-date-lot"))
        pub = parse_dt(n.get("publication-date"))
        cur_raw = n.get("estimated-value-cur-proc") or n.get("estimated-value-cur-lot") or "EUR"
        cur = str(cur_raw[0] if isinstance(cur_raw, list) and cur_raw else cur_raw or "EUR")[:8]
        amt: float | None = None
        for k in ("estimated-value-proc", "framework-maximum-value-lot", "estimated-value-lot"):
            raw = n.get(k)
            if raw is None:
                continue
            vals = raw if isinstance(raw, list) else [raw]
            nums = []
            for v in vals:
                try:
                    num = float(str(v).replace(" ", "").replace(",", "."))
                    if num > 0:
                        nums.append(num)
                except ValueError:
                    pass
            if nums:
                amt = max(nums)
                break
        proc = n.get("procedure-type")
        if isinstance(proc, list):
            proc = ", ".join(str(p) for p in proc)
        desc = pick_lang(n.get("description-proc")) or title
        out.append(
            {
                "id": f"TED:{pub_num}",
                "source": "TED",
                "region": region,
                "country": country,
                "title": title[:300],
                "buyer_name": buyer,
                "department": "FR-EU" if region == "FR" else country,
                "cpv_codes": cpvs[:8],
                "procedure_type": str(proc)[:80] if proc else None,
                "publication_date": pub.isoformat() if pub else None,
                "deadline_date": dl.isoformat() if dl else None,
                "estimated_amount": amt,
                "currency": cur,
                "url": f"https://ted.europa.eu/fr/notice/-/detail/{pub_num}",
                "description": desc[:600],
                "attribution": "source: Publications Office of the European Union — TED",
            }
        )
    return out


def score_and_filter(tenders: list[dict[str, Any]]) -> list[dict[str, Any]]:
    now = datetime.now(timezone.utc)
    target_cpvs = PROFILE["target_cpv_codes"]
    target_depts = set(PROFILE["target_departments"])
    target_kws = PROFILE["target_keywords"]
    min_amt, max_amt = PROFILE["min_target_amount"], PROFILE["max_target_amount"]

    scored: list[dict[str, Any]] = []
    seen_ids: set[str] = set()
    for t in tenders:
        if t["id"] in seen_ids:
            continue
        seen_ids.add(t["id"])

        dl = parse_dt(t.get("deadline_date"))
        if dl and dl < now:
            continue
        days_left = (dl - now).days if dl else None

        blob = f"{t.get('title', '')} {t.get('description', '')}".lower()
        cpvs = [re.sub(r"\D", "", c) for c in (t.get("cpv_codes") or [])]
        cpv_divs = {c[:2] for c in target_cpvs}
        matched_cpvs4 = [c for c in cpvs if any(c.startswith(tc[:4]) for tc in target_cpvs)]
        matched_cpvs2 = [c for c in cpvs if len(c) >= 2 and c[:2] in cpv_divs]
        matched_kws = [k for k in target_kws if k.lower() in blob]
        has_it = any(term in blob for term in IT_FALLBACK_TERMS)

        if not (matched_cpvs4 or matched_cpvs2 or matched_kws or has_it):
            continue

        score = 30
        reasons: list[str] = []

        if matched_cpvs4 or matched_kws:
            score += min(40, 18 + 6 * len(matched_kws) + 8 * len(matched_cpvs4))
            tags = list(dict.fromkeys(matched_kws[:3] + matched_cpvs4[:2]))
            reasons.append(f"Forte adéquation métier IT/MSP ({', '.join(tags)}).")
        elif matched_cpvs2:
            score += 22
            reasons.append(f"Adéquation CPV sectorielle ({', '.join(matched_cpvs2[:3])}).")
        else:
            reasons.append("Correspondance IT générale — vérifier le périmètre technique.")

        if t["region"] == "FR":
            if t.get("department") in target_depts:
                score += 20
                reasons.append(f"France — Zone prioritaire (département {t['department']}, proche Ris-Orangis 91).")
            else:
                score += 13
                reasons.append(f"France (département {t.get('department') or 'national'}) — éligible prestation nationale.")
        else:
            if t["country"] in {"BEL", "LUX", "CHE", "MCO"}:
                score += 12
                reasons.append(f"Union Européenne francophone ({t['country']}) — forte accessibilité.")
            elif t["country"] in {"IRL", "NLD", "DEU", "ESP", "ITA", "PRT", "AUT", "DNK", "SWE", "FIN"}:
                score += 7
                reasons.append(f"Union Européenne ({t['country']}) — marché transfrontalier IT/cloud.")
            else:
                score += 4
                reasons.append(f"Union Européenne ({t['country']}) — vérifier exigences linguistiques.")

        amt = t.get("estimated_amount")
        cur = t.get("currency") or "EUR"
        if isinstance(amt, (int, float)) and amt > 0:
            fmt = f"{amt:,.0f} {cur}".replace(",", " ")
            if min_amt <= amt <= max_amt:
                score += 10
                amt_note = f"Montant cible optimal ({fmt})"
            elif amt < min_amt:
                score += 3
                amt_note = f"Petit marché ({fmt})"
            elif amt <= max_amt * 4:
                score += 4
                amt_note = f"Montant élevé ({fmt} — lotissement/GME à vérifier)"
            else:
                score -= 8
                amt_note = f"Marché d'envergure ({fmt} — groupement/sous-traitance recommandé)"
        else:
            score += 4
            amt_note = "Montant non publié (vérifier seuil MAPA / BPU)"

        if days_left is not None:
            if days_left >= 10:
                score += 8
                reasons.append(f"{amt_note} • Délai confortable (J-{days_left}).")
            else:
                score += 2
                reasons.append(f"{amt_note} • Délai court (J-{days_left}).")
        else:
            reasons.append(f"{amt_note} • Date limite à confirmer.")

        score = max(0, min(100, score))
        if score < PROFILE["min_suitability_score"]:
            continue

        t["suitability_score"] = score
        t["suitability_summary"] = reasons[:3]
        t["days_remaining"] = days_left
        scored.append(t)

    scored.sort(
        key=lambda x: (
            0 if x["region"] == "FR" else 1,
            -x["suitability_score"],
            x["deadline_date"] or "9999-12-31",
        )
    )
    return scored


def main() -> None:
    raw: list[dict[str, Any]] = []
    try:
        raw.extend(fetch_boamp(limit=250))
    except Exception as exc:
        print("BOAMP fetch warning:", exc)
    try:
        raw.extend(fetch_ted("FRA", limit=50))
    except Exception as exc:
        print("TED FRA fetch warning:", exc)
    try:
        raw.extend(fetch_ted("EU", limit=100))
    except Exception as exc:
        print("TED EU fetch warning:", exc)

    tenders = score_and_filter(raw)
    out_path = Path(__file__).resolve().parents[2] / "docs" / "data" / "tenders.json"
    out_path.parent.mkdir(parents=True, exist_ok=True)
    payload = {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "company": PROFILE,
        "counts": {
            "total": len(tenders),
            "france": sum(1 for t in tenders if t["region"] == "FR"),
            "eu": sum(1 for t in tenders if t["region"] == "EU"),
        },
        "tenders": tenders,
    }
    out_path.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"Wrote {out_path} ({payload['counts']})")


if __name__ == "__main__":
    main()
