from __future__ import annotations

import json
import logging
import re
from datetime import datetime, timezone
from typing import Any

from app.config import get_settings
from app.models.db_models import CompanyProfile
from app.services.dce_parser import ParsedDocument

logger = logging.getLogger(__name__)


def _extract_json_block(raw_text: str) -> dict[str, Any]:
    cleaned = raw_text.strip()
    if cleaned.startswith("```"):
        cleaned = re.sub(r"^```(?:json)?\s*", "", cleaned)
        cleaned = re.sub(r"\s*```$", "", cleaned)
    start = cleaned.find("{")
    end = cleaned.rfind("}")
    if start >= 0 and end > start:
        cleaned = cleaned[start : end + 1]
    return json.loads(cleaned)


class LlmAnalyzer:
    """LLM orchestration layer for Go/No-Go scoring, DCE compliance extraction, and mémoire drafting."""

    def __init__(self) -> None:
        self.settings = get_settings()

    def _has_active_llm(self) -> bool:
        provider = self.settings.llm_provider.lower()
        if provider == "openai" and self.settings.openai_api_key:
            return True
        if provider == "gemini" and self.settings.gemini_api_key:
            return True
        return False

    def _call_text(self, system_prompt: str, user_prompt: str, json_mode: bool = False) -> str:
        provider = self.settings.llm_provider.lower()
        if provider == "openai" and self.settings.openai_api_key:
            from openai import OpenAI

            client = OpenAI(api_key=self.settings.openai_api_key)
            kwargs: dict[str, Any] = {
                "model": self.settings.llm_model,
                "messages": [
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt},
                ],
                "temperature": 0.2,
            }
            if json_mode:
                kwargs["response_format"] = {"type": "json_object"}
            resp = client.chat.completions.create(**kwargs)
            return resp.choices[0].message.content or ""

        if provider == "gemini" and self.settings.gemini_api_key:
            from google import genai
            from google.genai import types

            client = genai.Client(api_key=self.settings.gemini_api_key)
            config_kwargs: dict[str, Any] = {
                "system_instruction": system_prompt,
                "temperature": 0.2,
            }
            if json_mode:
                config_kwargs["response_mime_type"] = "application/json"
            resp = client.models.generate_content(
                model=self.settings.gemini_model,
                contents=user_prompt,
                config=types.GenerateContentConfig(**config_kwargs),
            )
            return resp.text or ""

        raise RuntimeError("No active external LLM configured")

    def score_tender_go_no_go(
        self,
        profile: CompanyProfile | None,
        tender: dict[str, Any],
    ) -> tuple[int, list[str]]:
        """Score a BOAMP tender 0-100 against the company profile and return a 3-bullet Go/No-Go summary."""
        if self._has_active_llm() and profile is not None:
            system_prompt = (
                "Tu es un directeur avant-vente expert en marchés publics français. "
                "Réponds uniquement en JSON valide avec les clés: "
                "'score' (entier 0-100) et 'summary' (liste exacte de 3 puces concises en français)."
            )
            user_prompt = json.dumps(
                {
                    "company_profile": {
                        "name": profile.name,
                        "description": profile.description,
                        "capabilities": profile.capabilities,
                        "certifications": profile.certifications,
                        "target_cpv_codes": profile.target_cpv_codes,
                        "target_departments": profile.target_departments,
                        "target_keywords": profile.target_keywords,
                    },
                    "tender": {
                        "title": tender.get("title"),
                        "buyer_name": tender.get("buyer_name"),
                        "department": tender.get("department"),
                        "cpv_codes": tender.get("cpv_codes"),
                        "procedure_type": tender.get("procedure_type"),
                        "deadline_date": str(tender.get("deadline_date") or ""),
                        "description": (tender.get("description") or "")[:1800],
                    },
                },
                ensure_ascii=False,
            )
            try:
                raw = self._call_text(system_prompt, user_prompt, json_mode=True)
                parsed = _extract_json_block(raw)
                score = max(0, min(100, int(parsed.get("score", 50))))
                bullets = [str(b).strip() for b in parsed.get("summary", []) if str(b).strip()][:3]
                if len(bullets) == 3:
                    return score, bullets
            except Exception as exc:
                logger.warning("LLM Go/No-Go failed (%s); using deterministic scoring.", exc)

        return self._heuristic_go_no_go(profile, tender)

    def _heuristic_go_no_go(
        self,
        profile: CompanyProfile | None,
        tender: dict[str, Any],
    ) -> tuple[int, list[str]]:
        score = 45
        reasons: list[str] = []

        text_blob = f"{tender.get('title', '')} {tender.get('description', '')}".lower()
        dept = str(tender.get("department") or "")
        cpvs = [str(c) for c in (tender.get("cpv_codes") or [])]

        if profile:
            if dept and dept in (profile.target_departments or []):
                score += 20
                reasons.append(f"Zone géographique cible correspondante (département {dept}).")
            else:
                reasons.append(f"Département ({dept or 'non précisé'}) hors zone prioritaire configurée.")

            matched_kws = [kw for kw in (profile.target_keywords or []) if kw.lower() in text_blob]
            matched_cpvs = [
                c for c in cpvs if any(c.startswith(tc[:4]) for tc in (profile.target_cpv_codes or []) if len(tc) >= 4)
            ]
            if matched_kws or matched_cpvs:
                score += min(25, 10 + 5 * len(matched_kws) + 8 * len(matched_cpvs))
                reasons.append(
                    f"Alignement métier détecté ({', '.join((matched_kws + matched_cpvs)[:4])})."
                )
            else:
                reasons.append("Correspondance CPV/mots-clés faible — vérifier le périmètre technique du DCE.")
        else:
            reasons.append("Profil entreprise par défaut — affinez vos critères CPV et départements.")

        deadline = tender.get("deadline_date")
        if isinstance(deadline, datetime):
            days_left = (deadline - datetime.now(timezone.utc)).days
            if days_left >= 10:
                score += 10
                reasons.append(f"Délai confortable avant remise ({days_left} jour(s) restants).")
            elif days_left >= 0:
                reasons.append(f"Délai serré ({days_left} jour(s) restants) — mobilisation rapide requise.")
            else:
                score = max(10, score - 25)
                reasons.append("Date limite dépassée ou imminente — vérifier la recevabilité.")
        else:
            reasons.append("Date limite non structurée dans l'avis — contrôler le Règlement de Consultation.")

        return max(0, min(100, score)), reasons[:3]

    def analyze_dce_documents(
        self,
        parsed_docs: list[ParsedDocument],
        profile: CompanyProfile | None,
    ) -> dict[str, Any]:
        """Extract RC metadata, CCTP requirements, CCAP/BPU flags, checklist, and mémoire outline."""
        if self._has_active_llm():
            corpus_parts: list[str] = []
            for doc in parsed_docs:
                corpus_parts.append(f"### FICHIER: {doc.filename} (Rôle: {doc.role})\n{doc.text[:6000]}")
            combined_corpus = "\n\n".join(corpus_parts)[:24000]

            system_prompt = (
                "Tu es un expert en réponse aux marchés publics français (Code de la commande publique). "
                "Analyse les extraits de DCE fournis (RC, CCTP, CCAP, BPU/DPGF). "
                "Ne génère JAMAIS de prix engageants pour le BPU/DPGF : signale-les uniquement pour revue humaine. "
                "Réponds uniquement en JSON valide avec les clés exactes : "
                "submission_deadline (str|null), site_visit_required (bool), site_visit_details (str), "
                "lots (list[{number, title, description}]), "
                "evaluation_criteria (list[{name, weight}]), "
                "compliance_checklist (list[{id, item, source, mandatory, checked, human_review_required, notes}]), "
                "flagged_financial_legal (list[{file, clause_or_sheet, risk_level, summary, action}]), "
                "proposed_outline (list[{id, title, cctp_requirement, weight_hint}])."
            )
            user_prompt = (
                f"Entreprise candidate: {profile.name if profile else 'Mon Entreprise'}\n\n"
                f"{combined_corpus}"
            )
            try:
                raw = self._call_text(system_prompt, user_prompt, json_mode=True)
                data = _extract_json_block(raw)
                if "compliance_checklist" in data and "proposed_outline" in data:
                    return data
            except Exception as exc:
                logger.warning("LLM DCE analysis failed (%s); falling back to regex/heuristic parser.", exc)

        return self._heuristic_dce_analysis(parsed_docs)

    def _heuristic_dce_analysis(self, parsed_docs: list[ParsedDocument]) -> dict[str, Any]:
        rc_text = "\n".join(d.text for d in parsed_docs if d.role == "RC")
        cctp_text = "\n".join(d.text for d in parsed_docs if d.role == "CCTP")
        all_text = "\n".join(d.text for d in parsed_docs)

        # Deadline extraction
        deadline_match = re.search(
            r"(?:date\s+limite\s+de\s+remise|remise\s+des\s+offres|cl[oô]ture)[^\n:]{0,40}[:\s]+([0-3]?\d[/.-][01]?\d[/.-]\d{2,4}(?:\s*[àa]\s*\d{1,2}[h:]\d{2})?)",
            rc_text or all_text,
            flags=re.IGNORECASE,
        )
        submission_deadline = deadline_match.group(1).strip() if deadline_match else "À vérifier dans le RC"

        # Site visit check
        visit_required = bool(
            re.search(r"visite\s+(?:sur\s+site\s+)?obligatoire", rc_text or all_text, flags=re.IGNORECASE)
        )
        site_visit_details = (
            "Visite sur site obligatoire détectée — vérifier les créneaux et l'attestation de visite dans le RC."
            if visit_required
            else "Aucune visite obligatoire détectée automatiquement (vérifier le RC par prudence)."
        )

        # Evaluation weighting
        criteria: list[dict[str, str]] = []
        tech_match = re.search(r"valeur\s+technique[^\n%]{0,30}(\d{1,3})\s*%", rc_text or all_text, re.IGNORECASE)
        price_match = re.search(r"prix(?:\s+des\s+prestations)?[^\n%]{0,30}(\d{1,3})\s*%", rc_text or all_text, re.IGNORECASE)
        rse_match = re.search(r"(?:rse|environnement|développement\s+durable)[^\n%]{0,30}(\d{1,3})\s*%", rc_text or all_text, re.IGNORECASE)
        if tech_match:
            criteria.append({"name": "Valeur Technique", "weight": f"{tech_match.group(1)}%"})
        if price_match:
            criteria.append({"name": "Prix des prestations", "weight": f"{price_match.group(1)}%"})
        if rse_match:
            criteria.append({"name": "Développement durable / RSE", "weight": f"{rse_match.group(1)}%"})
        if not criteria:
            criteria = [
                {"name": "Valeur Technique (estimée)", "weight": "60%"},
                {"name": "Prix (vérification humaine)", "weight": "40%"},
            ]

        # Lots
        lot_matches = re.findall(r"(Lot\s*n?[°º]?\s*\d+)\s*[:\-–]\s*([^\n]{5,120})", all_text, re.IGNORECASE)
        lots = [
            {"number": m[0].strip(), "title": m[1].strip(), "description": "Extrait automatiquement du DCE"}
            for m in lot_matches[:8]
        ] or [{"number": "Lot unique", "title": "Marché non alloti ou lots à confirmer", "description": ""}]

        # Flagged CCAP / BPU / DPGF
        flagged: list[dict[str, str]] = []
        for doc in parsed_docs:
            if doc.role in {"CCAP", "BPU", "DPGF"}:
                flagged.append(
                    {
                        "file": doc.filename,
                        "clause_or_sheet": doc.role,
                        "risk_level": "Revue humaine obligatoire",
                        "summary": doc.notes
                        or f"Document {doc.role} contenant des engagements juridiques ou financiers.",
                        "action": "Contrôler les prix unitaires, pénalités, délais de paiement et clauses de résiliation.",
                    }
                )

        checklist = [
            {
                "id": "chk-dc1-dc2",
                "item": "Compléter DC1, DC2 (ou DUME) et attestations fiscales & sociales à jour",
                "source": "RC",
                "mandatory": True,
                "checked": False,
                "human_review_required": True,
                "notes": "Obligatoire avant dépôt sur le profil acheteur (PLACE, Maximilien, AWS).",
            },
            {
                "id": "chk-rc-deadline",
                "item": f"Confirmer la date limite de dépôt : {submission_deadline}",
                "source": "RC",
                "mandatory": True,
                "checked": False,
                "human_review_required": True,
                "notes": "Prévoir une marge de sécurité de 24h pour la signature électronique (RGS / eIDAS).",
            },
            {
                "id": "chk-cctp-compliance",
                "item": "Valider la couverture exhaustive des exigences techniques du CCTP",
                "source": "CCTP",
                "mandatory": True,
                "checked": False,
                "human_review_required": False,
                "notes": "Aligner les sous-sections du mémoire technique sur les critères de notation.",
            },
            {
                "id": "chk-bpu-human",
                "item": "Chiffrer et vérifier manuellement le BPU / DPGF et l'Acte d'Engagement (AE)",
                "source": "BPU",
                "mandatory": True,
                "checked": False,
                "human_review_required": True,
                "notes": "Aucun prix engageant n'est généré automatiquement par l'outil.",
            },
        ]
        if visit_required:
            checklist.insert(
                1,
                {
                    "id": "chk-visit",
                    "item": "Planifier la visite obligatoire sur site et récupérer le récépissé",
                    "source": "RC",
                    "mandatory": True,
                    "checked": False,
                    "human_review_required": True,
                    "notes": site_visit_details,
                },
            )

        cctp_excerpt = (cctp_text or all_text)[:1500].strip()
        outline = [
            {
                "id": "sec-1",
                "title": "1. Compréhension du besoin et contexte de l'acheteur",
                "cctp_requirement": cctp_excerpt[:450] or "Synthétiser les enjeux opérationnels et objectifs décrits dans le CCTP.",
                "weight_hint": criteria[0]["weight"] if criteria else "Critère technique",
            },
            {
                "id": "sec-2",
                "title": "2. Méthodologie d'exécution et organisation de l'équipe",
                "cctp_requirement": "Décrire la gouvernance, les profils intervenants, le planning de déploiement et les livrables attendus.",
                "weight_hint": "Sous-critère Méthodologie & Moyens humains",
            },
            {
                "id": "sec-3",
                "title": "3. Engagements de qualité, SLA, sécurité et continuité de service",
                "cctp_requirement": "Préciser les niveaux de service (GTI/GTR), le plan d'assurance qualité et la gestion des risques.",
                "weight_hint": "Sous-critère Qualité / SLA",
            },
            {
                "id": "sec-4",
                "title": "4. Démarche RSE, environnement et références similaires",
                "cctp_requirement": "Présenter les engagements environnementaux, certifications (ISO/RGE/MASE) et retours d'expérience vérifiables.",
                "weight_hint": "Sous-critère RSE & Références",
            },
        ]

        return {
            "submission_deadline": submission_deadline,
            "site_visit_required": visit_required,
            "site_visit_details": site_visit_details,
            "lots": lots,
            "evaluation_criteria": criteria,
            "compliance_checklist": checklist,
            "flagged_financial_legal": flagged,
            "proposed_outline": outline,
        }

    def draft_memoire_section(
        self,
        section_title: str,
        cctp_requirement: str,
        company_profile: CompanyProfile | None,
        rag_chunks: list[dict[str, Any]],
    ) -> dict[str, Any]:
        """Generate a tailored French mémoire technique section grounded in RAG chunks."""
        citations = [
            {
                "document_title": c.get("document_title"),
                "category": c.get("category"),
                "similarity": c.get("similarity"),
                "excerpt": c.get("content", "")[:260],
            }
            for c in rag_chunks
        ]

        if self._has_active_llm():
            context_blocks = "\n\n".join(
                f"[Source: {c['document_title']} ({c['category']})]\n{c['content']}" for c in rag_chunks
            )
            system_prompt = (
                "Tu es un rédacteur expert de mémoires techniques pour les marchés publics français. "
                "Rédige une section structurée, professionnelle et persuasive en français, "
                "en réutilisant le vocabulaire exact du CCTP et les preuves de la base de connaissances fournie. "
                "RÈGLE IMPÉRATIVE : partout où une information précise manque (noms exacts des intervenants, "
                "délais contractuels chiffrés, montant ou prix, référence de certificat), insère le marqueur "
                "exact `[À COMPLÉTER PAR L'ÉQUIPE]`."
            )
            user_prompt = (
                f"Section du mémoire : {section_title}\n"
                f"Entreprise : {company_profile.name if company_profile else 'Entreprise candidate'}\n"
                f"Certifications : {', '.join(company_profile.certifications) if company_profile else 'Non renseigné'}\n\n"
                f"Exigence du CCTP :\n{cctp_requirement}\n\n"
                f"Extraits de la base de connaissances :\n{context_blocks or 'Aucun extrait indexé pour le moment.'}"
            )
            try:
                draft_text = self._call_text(system_prompt, user_prompt, json_mode=False).strip()
                if draft_text:
                    return {"draft_markdown": draft_text, "citations": citations}
            except Exception as exc:
                logger.warning("LLM draft failed (%s); falling back to structured template.", exc)

        # Clean offline/fallback synthesis using retrieved chunks
        company_name = company_profile.name if company_profile else "Notre entreprise"
        certs = ", ".join(company_profile.certifications) if (company_profile and company_profile.certifications) else "[À COMPLÉTER PAR L'ÉQUIPE : certifications applicables]"
        kb_synthesis = (
            "\n".join(f"- **{c['document_title']}** ({c['category']}) : {c['content'][:320]}..." for c in rag_chunks[:3])
            if rag_chunks
            else "- [À COMPLÉTER PAR L'ÉQUIPE : importer vos anciens mémoires techniques dans la Base de Connaissances pour enrichir cette section]"
        )

        draft_markdown = (
            f"### Réponse proposée — {section_title}\n\n"
            f"**{company_name}** s'engage à répondre de manière exhaustive à l'exigence exprimée dans le CCTP :\n"
            f"> {cctp_requirement[:350]}\n\n"
            f"#### Approche opérationnelle et moyens mobilisés\n"
            f"1. **Pilotage dédié** : désignation d'un chef de projet référent ([À COMPLÉTER PAR L'ÉQUIPE : nom et CV du responsable]).\n"
            f"2. **Traçabilité et qualité** : application de nos procédures certifiées ({certs}) et suivi par indicateurs mensuels.\n"
            f"3. **Engagements de délai et livrables** : [À COMPLÉTER PAR L'ÉQUIPE : préciser les GTI/GTR et jalons contractuels].\n\n"
            f"#### Éléments issus de la base de connaissances interne\n"
            f"{kb_synthesis}\n"
        )
        return {"draft_markdown": draft_markdown, "citations": citations}
