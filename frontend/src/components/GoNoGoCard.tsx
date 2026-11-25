"use client";

import { ExternalLink, FolderPlus, CheckCircle2, Archive } from "lucide-react";
import type { TenderNotice } from "@/lib/api";
import { UI_TEXT, type Lang } from "@/lib/i18n";

interface Props {
  lang: Lang;
  tender: TenderNotice;
  onStatusChange: (id: number, status: string) => void;
  onCreateWorkspace: (tender: TenderNotice) => void;
}

export function GoNoGoCard({
  lang,
  tender,
  onStatusChange,
  onCreateWorkspace,
}: Props) {
  const t = UI_TEXT[lang];
  const score = tender.go_no_go_score ?? 0;
  const badgeColor =
    score >= 70
      ? "bg-emerald-100 text-emerald-800 border-emerald-300"
      : score >= 45
        ? "bg-amber-100 text-amber-800 border-amber-300"
        : "bg-rose-100 text-rose-800 border-rose-300";

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-slate-300">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1 flex-1 min-w-[240px]">
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
            <span className="font-mono rounded bg-slate-100 px-2 py-0.5 text-slate-700">
              BOAMP {tender.boamp_id}
            </span>
            {tender.department && (
              <span className="rounded bg-blue-50 px-2 py-0.5 font-medium text-blue-700">
                Dept. {tender.department}
              </span>
            )}
            {tender.procedure_type && (
              <span className="rounded bg-slate-100 px-2 py-0.5">
                {tender.procedure_type}
              </span>
            )}
            <span className="uppercase tracking-wide font-semibold text-slate-600">
              [{tender.status}]
            </span>
          </div>
          <h3 className="text-base font-semibold text-slate-900">{tender.title}</h3>
          <p className="text-sm text-slate-600">
            {t.buyer} :{" "}
            <span className="font-medium text-slate-800">
              {tender.buyer_name || t.unspecified}
            </span>
            {tender.deadline_date && (
              <span className="ml-3 text-slate-500">
                • {t.deadline} :{" "}
                <strong className="text-slate-800">
                  {new Date(tender.deadline_date).toLocaleDateString(
                    lang === "fr" ? "fr-FR" : "en-GB"
                  )}
                </strong>
              </span>
            )}
          </p>
        </div>

        <div className={`rounded-lg border px-3 py-2 text-center ${badgeColor}`}>
          <div className="text-[11px] font-medium uppercase tracking-wider">Go / No-Go</div>
          <div className="text-xl font-bold">{score}/100</div>
        </div>
      </div>

      {tender.go_no_go_summary?.length > 0 && (
        <ul className="mt-3 space-y-1 rounded-lg bg-slate-50 p-3 text-sm text-slate-700">
          {tender.go_no_go_summary.map((bullet, idx) => (
            <li key={idx} className="flex items-start gap-2">
              <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-600" />
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
              BOAMP
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
