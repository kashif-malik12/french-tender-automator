"use client";

import { RefreshCw, BookOpen } from "lucide-react";
import type { MemoireSection } from "@/lib/api";
import { UI_TEXT, type Lang } from "@/lib/i18n";

interface Props {
  lang: Lang;
  section: MemoireSection;
  regenerating: boolean;
  onChangeDraft: (sectionId: string, nextDraft: string) => void;
  onRegenerate: (sectionId: string) => void;
}

export function SectionEditor({
  lang,
  section,
  regenerating,
  onChangeDraft,
  onRegenerate,
}: Props) {
  const t = UI_TEXT[lang];
  const placeholderCount = (
    section.draft_markdown.match(/\[À COMPLÉTER PAR L'ÉQUIPE/g) || []
  ).length;

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
        <div>
          <h4 className="text-sm font-semibold text-slate-900">{section.title}</h4>
          {section.weight_hint && (
            <span className="text-xs text-blue-700">{section.weight_hint}</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {placeholderCount > 0 && (
            <span className="rounded-full bg-rose-100 px-2.5 py-0.5 text-[11px] font-semibold text-rose-800">
              {placeholderCount} {t.fieldsToComplete}
            </span>
          )}
          <button
            type="button"
            disabled={regenerating}
            onClick={() => onRegenerate(section.id)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${regenerating ? "animate-spin" : ""}`} />
            {t.regenerateRag}
          </button>
        </div>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-12">
        <div className="space-y-3 lg:col-span-5">
          <div className="rounded-lg border border-blue-100 bg-blue-50/70 p-3">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-blue-800">
              {t.cctpRequirement}
            </div>
            <p className="mt-1 whitespace-pre-wrap text-xs text-slate-800">
              {section.cctp_requirement}
            </p>
          </div>

          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
            <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-700">
              <BookOpen className="h-3.5 w-3.5" />
              {t.kbCitations} ({section.citations?.length || 0})
            </div>
            <div className="mt-2 space-y-2">
              {!section.citations || section.citations.length === 0 ? (
                <p className="text-xs text-slate-500">{t.noCitations}</p>
              ) : (
                section.citations.map((cit, i) => (
                  <div key={i} className="rounded border border-slate-200 bg-white p-2 text-xs">
                    <div className="flex items-center justify-between gap-2 font-medium text-slate-800">
                      <span>{cit.document_title}</span>
                      <span className="text-[10px] text-slate-500">
                        {cit.category} • {(cit.similarity * 100).toFixed(0)}%
                      </span>
                    </div>
                    <p className="mt-1 line-clamp-3 text-[11px] text-slate-600">
                      {cit.excerpt}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="lg:col-span-7">
          <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-slate-600">
            {t.draftLabel}
          </label>
          <textarea
            value={section.draft_markdown}
            onChange={(e) => onChangeDraft(section.id, e.target.value)}
            rows={13}
            className="w-full rounded-lg border border-slate-300 p-3 font-mono text-xs leading-relaxed text-slate-900 focus:border-blue-600 focus:outline-none"
          />
        </div>
      </div>
    </div>
  );
}
