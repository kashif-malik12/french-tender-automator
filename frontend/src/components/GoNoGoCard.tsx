"use client";

import {
  Archive,
  CalendarClock,
  CheckCircle2,
  Coins,
  ExternalLink,
  FolderPlus,
  Globe2,
} from "lucide-react";
import type { TenderNotice } from "@/lib/api";
import { UI_TEXT, type Lang } from "@/lib/i18n";

interface Props {
  lang: Lang;
  tender: TenderNotice;
  onStatusChange: (id: number, status: string) => void;
  onCreateWorkspace: (tender: TenderNotice) => void;
}

function formatAmount(lang: Lang, amount?: number | null, currency = "EUR"): string {
  const t = UI_TEXT[lang];
  if (amount == null || amount <= 0) {
    return t.amountUnpublished;
  }
  const locale = lang === "fr" ? "fr-FR" : "en-GB";
  return `${Math.round(amount).toLocaleString(locale)} ${currency} ${t.amountHt}`;
}

export function GoNoGoCard({ lang, tender, onStatusChange, onCreateWorkspace }: Props) {
  const t = UI_TEXT[lang];
  const score = tender.go_no_go_score ?? 0;
  const badgeColor =
    score >= 75
      ? "bg-emerald-100 text-emerald-800 border-emerald-300"
      : score >= 55
        ? "bg-amber-100 text-amber-800 border-amber-300"
        : "bg-rose-100 text-rose-800 border-rose-300";

  const isFrance = tender.region === "FR";
  const daysLeft = tender.days_remaining;
  const deadlineUrgent = daysLeft !== null && daysLeft !== undefined && daysLeft <= 10;

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-slate-300">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-[240px] flex-1 space-y-1.5">
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
            <span
              className={`inline-flex items-center gap-1 rounded px-2 py-0.5 font-semibold ${
                isFrance
                  ? "bg-blue-100 text-blue-800"
                  : "bg-indigo-100 text-indigo-800"
              }`}
            >
              <Globe2 className="h-3 w-3" />
              {isFrance ? "France" : `${lang === "en" ? "EU" : "UE"} (${tender.country})`} • {tender.source}
            </span>

            <span className="rounded bg-slate-100 px-2 py-0.5 font-mono text-slate-700">
              {tender.boamp_id}
            </span>

            {tender.department && isFrance && (
              <span className="rounded bg-blue-50 px-2 py-0.5 font-medium text-blue-700">
                Dept. {tender.department}
              </span>
            )}

            {tender.procedure_type && (
              <span className="rounded bg-slate-100 px-2 py-0.5">
                {tender.procedure_type}
              </span>
            )}

            {tender.cpv_codes?.slice(0, 2).map((cpv) => (
              <span key={cpv} className="rounded bg-slate-50 px-1.5 py-0.5 font-mono text-[11px] text-slate-600">
                CPV {cpv}
              </span>
            ))}

            <span className="font-semibold uppercase tracking-wide text-slate-600">
              [{tender.status}]
            </span>
          </div>

          <h3 className="text-base font-semibold text-slate-900">{tender.title}</h3>

          <p className="text-sm text-slate-600">
            {t.buyer} :{" "}
            <span className="font-medium text-slate-800">
              {tender.buyer_name || t.unspecified}
            </span>
          </p>

          <div className="flex flex-wrap items-center gap-3 pt-1 text-xs">
            <span
              className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1 font-medium ${
                deadlineUrgent
                  ? "bg-rose-50 text-rose-800 border border-rose-200"
                  : "bg-slate-100 text-slate-800"
              }`}
            >
              <CalendarClock className="h-3.5 w-3.5" />
              {t.deadline} :{" "}
              <strong>
                {tender.deadline_date
                  ? new Date(tender.deadline_date).toLocaleDateString(
                      lang === "fr" ? "fr-FR" : "en-GB"
                    )
                  : t.checkDceDeadline}
              </strong>
              {daysLeft !== null && daysLeft !== undefined && (
                <span className="ml-1 font-bold">
                  ({daysLeft >= 0 ? `${t.daysPrefix}${daysLeft}` : t.expired})
                </span>
              )}
            </span>

            <span className="inline-flex items-center gap-1 rounded-md border border-emerald-200 bg-emerald-50 px-2.5 py-1 font-medium text-emerald-900">
              <Coins className="h-3.5 w-3.5 text-emerald-700" />
              {t.targetAmount} :{" "}
              <strong>{formatAmount(lang, tender.estimated_amount, tender.currency)}</strong>
            </span>
          </div>
        </div>

        <div className={`rounded-lg border px-3 py-2 text-center ${badgeColor}`}>
          <div className="text-[11px] font-medium uppercase tracking-wider">{t.suitability}</div>
          <div className="text-xl font-bold">{score}/100</div>
        </div>
      </div>

      {tender.go_no_go_summary?.length > 0 && (
        <ul className="mt-3 space-y-1 rounded-lg bg-slate-50 p-3 text-sm text-slate-700">
          {tender.go_no_go_summary.map((bullet, idx) => (
            <li key={idx} className="flex items-start gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-600" />
              <span>{bullet}</span>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-3">
        <span className="text-[11px] text-slate-400">{tender.attribution}</span>
        <div className="flex flex-wrap items-center gap-2">
          {tender.boamp_url && (
            <a
              href={tender.boamp_url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              {tender.source === "TED" ? t.viewTed : t.viewBoamp}
            </a>
          )}
          <button
            type="button"
            onClick={() => onStatusChange(tender.id, "shortlisted")}
            className="inline-flex items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1.5 text-xs font-medium text-emerald-700 hover:bg-emerald-100"
          >
            <CheckCircle2 className="h-3.5 w-3.5" />
            {t.shortlist}
          </button>
          <button
            type="button"
            onClick={() => onStatusChange(tender.id, "archived")}
            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100"
          >
            <Archive className="h-3.5 w-3.5" />
            {t.archive}
          </button>
          <button
            type="button"
            onClick={() => onCreateWorkspace(tender)}
            className="inline-flex items-center gap-1 rounded-lg bg-blue-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-800"
          >
            <FolderPlus className="h-3.5 w-3.5" />
            {t.openDce}
          </button>
        </div>
      </div>
    </div>
  );
}
