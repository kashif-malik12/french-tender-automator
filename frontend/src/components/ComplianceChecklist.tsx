"use client";

import { AlertTriangle, CheckSquare, Square } from "lucide-react";
import type { ChecklistItem } from "@/lib/api";

interface Props {
  checklist: ChecklistItem[];
  flaggedFinancialLegal: Array<{
    file: string;
    clause_or_sheet: string;
    risk_level: string;
    summary: string;
    action: string;
  }>;
  onToggleItem: (id: string) => void;
}

export function ComplianceChecklist({
  checklist,
  flaggedFinancialLegal,
  onToggleItem,
}: Props) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <h4 className="text-sm font-semibold text-slate-900">
          Matrice de conformité & pièces requises
        </h4>
        <div className="mt-3 space-y-2">
          {checklist.length === 0 ? (
            <p className="text-xs text-slate-500">
              Importez un DCE (.zip, .pdf, .docx, .xlsx) pour générer la checklist.
            </p>
          ) : (
            checklist.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => onToggleItem(item.id)}
                className="flex w-full items-start gap-2.5 rounded-lg border border-slate-100 p-2.5 text-left transition hover:bg-slate-50"
              >
                {item.checked ? (
                  <CheckSquare className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                ) : (
                  <Square className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                )}
                <div className="flex-1 text-xs">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span
                      className={`font-medium ${
                        item.checked ? "line-through text-slate-400" : "text-slate-800"
                      }`}
                    >
                      {item.item}
                    </span>
                    <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-600">
                      {item.source}
                    </span>
                    {item.human_review_required && (
                      <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-800">
                        Validation humaine
                      </span>
                    )}
                  </div>
                  {item.notes && (
                    <p className="mt-1 text-[11px] text-slate-500">{item.notes}</p>
                  )}
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-4 shadow-sm">
        <div className="flex items-center gap-2 text-amber-900">
          <AlertTriangle className="h-4 w-4" />
          <h4 className="text-sm font-semibold">
            Clauses financières & juridiques signalées (CCAP / BPU / DPGF)
          </h4>
        </div>
        <p className="mt-1 text-xs text-amber-800">
          Garde-fou strict : aucun prix contractuel n&apos;est généré automatiquement.
        </p>
        <div className="mt-3 space-y-2">
          {flaggedFinancialLegal.length === 0 ? (
            <p className="text-xs text-amber-700">
              Aucun fichier CCAP/BPU/DPGF détecté dans cet espace pour le moment.
            </p>
          ) : (
            flaggedFinancialLegal.map((flag, idx) => (
              <div
                key={idx}
                className="rounded-lg border border-amber-200 bg-white p-3 text-xs"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold text-slate-900">{flag.file}</span>
                  <span className="rounded bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-900">
                    {flag.clause_or_sheet} • {flag.risk_level}
                  </span>
                </div>
                <p className="mt-1 text-slate-700">{flag.summary}</p>
                <p className="mt-1 font-medium text-amber-900">Action : {flag.action}</p>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
