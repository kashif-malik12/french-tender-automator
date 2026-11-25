"use client";

import { useEffect, useState } from "react";
import { Download, FileUp, Plus, Save } from "lucide-react";
import {
  apiDownloadBlob,
  apiFetch,
  type TenderWorkspace,
} from "@/lib/api";
import { ComplianceChecklist } from "./ComplianceChecklist";
import { SectionEditor } from "./SectionEditor";

interface Props {
  activeWorkspaceId: number | null;
  onSelectWorkspace: (id: number) => void;
}

export function WorkspaceView({ activeWorkspaceId, onSelectWorkspace }: Props) {
  const [workspaces, setWorkspaces] = useState<TenderWorkspace[]>([]);
  const [current, setCurrent] = useState<TenderWorkspace | null>(null);
  const [newTitle, setNewTitle] = useState("");
  const [newBuyer, setNewBuyer] = useState("");
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [regeneratingId, setRegeneratingId] = useState<string | null>(null);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  async function refreshList() {
    const list = await apiFetch<TenderWorkspace[]>("/workspaces");
    setWorkspaces(list);
    const targetId = activeWorkspaceId ?? list[0]?.id ?? null;
    if (targetId) {
      const ws = await apiFetch<TenderWorkspace>(`/workspaces/${targetId}`);
      setCurrent(ws);
    }
  }

  useEffect(() => {
    refreshList().catch((e) => setStatusMsg(String(e)));
  }, [activeWorkspaceId]);

  async function handleCreateWorkspace(e: React.FormEvent) {
    e.preventDefault();
    if (!newTitle.trim()) return;
    const ws = await apiFetch<TenderWorkspace>("/workspaces", {
      method: "POST",
      body: JSON.stringify({ title: newTitle.trim(), buyer_name: newBuyer.trim() || null }),
    });
    setNewTitle("");
    setNewBuyer("");
    setWorkspaces((prev) => [ws, ...prev]);
    setCurrent(ws);
    onSelectWorkspace(ws.id);
  }

  async function handleDceUpload(e: React.ChangeEvent<HTMLInputElement>) {
    if (!current || !e.target.files?.length) return;
    setUploading(true);
    setStatusMsg(null);
    try {
      const form = new FormData();
      Array.from(e.target.files).forEach((f) => form.append("files", f));
      const updated = await apiFetch<TenderWorkspace>(
        `/workspaces/${current.id}/upload-dce`,
        { method: "POST", body: form }
      );
      setCurrent(updated);
      setStatusMsg("DCE analysé, checklist générée et sections du mémoire pré-rédigées.");
    } catch (err) {
      setStatusMsg(`Erreur analyse DCE : ${String(err)}`);
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  function handleToggleChecklist(itemId: string) {
    if (!current) return;
    setCurrent({
      ...current,
      compliance_checklist: current.compliance_checklist.map((item) =>
        item.id === itemId ? { ...item, checked: !item.checked } : item
      ),
    });
  }

  function handleChangeDraft(sectionId: string, nextDraft: string) {
    if (!current) return;
    setCurrent({
      ...current,
      memoire_sections: current.memoire_sections.map((sec) =>
        sec.id === sectionId ? { ...sec, draft_markdown: nextDraft } : sec
      ),
    });
  }

  async function handleSaveWorkspace() {
    if (!current) return;
    setSaving(true);
    try {
      const updated = await apiFetch<TenderWorkspace>(`/workspaces/${current.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          compliance_checklist: current.compliance_checklist,
          memoire_sections: current.memoire_sections,
        }),
      });
      setCurrent(updated);
      setStatusMsg("Modifications sauvegardées.");
    } finally {
      setSaving(false);
    }
  }

  async function handleRegenerate(sectionId: string) {
    if (!current) return;
    setRegeneratingId(sectionId);
    try {
      const updated = await apiFetch<TenderWorkspace>(
        `/workspaces/${current.id}/sections/${sectionId}/regenerate`,
        { method: "POST" }
      );
      setCurrent(updated);
    } finally {
      setRegeneratingId(null);
    }
  }

  async function handleExportDocx() {
    if (!current) return;
    await handleSaveWorkspace();
    const blob = await apiDownloadBlob(`/workspaces/${current.id}/export-docx`);
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `memoire_technique_${current.id}.docx`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6">
      {/* Workspace selector & quick creator */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Dossier actif :
            </label>
            <select
              value={current?.id || ""}
              onChange={(e) => onSelectWorkspace(Number(e.target.value))}
              className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium"
            >
              {workspaces.length === 0 && <option value="">Aucun dossier</option>}
              {workspaces.map((ws) => (
                <option key={ws.id} value={ws.id}>
                  #{ws.id} — {ws.title}
                </option>
              ))}
            </select>
          </div>

          <form onSubmit={handleCreateWorkspace} className="flex flex-wrap items-center gap-2">
            <input
              type="text"
              placeholder="Titre du nouveau marché..."
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs"
            />
            <input
              type="text"
              placeholder="Acheteur public (optionnel)"
              value={newBuyer}
              onChange={(e) => setNewBuyer(e.target.value)}
              className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs"
            />
            <button
              type="submit"
              className="inline-flex items-center gap-1 rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-800"
            >
              <Plus className="h-3.5 w-3.5" />
              Nouveau dossier
            </button>
          </form>
        </div>
      </div>

      {current ? (
        <>
          {/* DCE upload & extracted RC metadata */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-slate-900">{current.title}</h2>
                <p className="text-xs text-slate-500">
                  Acheteur : {current.buyer_name || "Non précisé"} • Date limite RC :{" "}
                  <strong className="text-slate-800">
                    {current.submission_deadline || "En attente de DCE"}
                  </strong>
                  {current.site_visit_required && (
                    <span className="ml-2 rounded bg-rose-100 px-2 py-0.5 font-semibold text-rose-800">
                      Visite sur site obligatoire
                    </span>
                  )}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-800 hover:bg-blue-100">
                  <FileUp className="h-3.5 w-3.5" />
                  {uploading ? "Analyse en cours..." : "Importer DCE (.zip/.pdf/.docx/.xlsx)"}
                  <input
                    type="file"
                    multiple
                    accept=".zip,.pdf,.docx,.xlsx,.txt"
                    onChange={handleDceUpload}
                    className="hidden"
                  />
                </label>

                <button
                  type="button"
                  onClick={handleSaveWorkspace}
                  disabled={saving}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  <Save className="h-3.5 w-3.5" />
                  Sauvegarder
                </button>

                <button
                  type="button"
                  onClick={handleExportDocx}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-700 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-emerald-800"
                >
                  <Download className="h-3.5 w-3.5" />
                  Exporter .docx
                </button>
              </div>
            </div>

            {statusMsg && (
              <p className="mt-3 rounded-lg bg-slate-100 px-3 py-2 text-xs text-slate-700">
                {statusMsg}
              </p>
            )}

            {current.dce_files.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-2">
                {current.dce_files.map((f, i) => (
                  <span
                    key={i}
                    className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs text-slate-700"
                  >
                    <strong className="text-blue-700">[{f.role}]</strong> {f.filename}
                  </span>
                ))}
              </div>
            )}

            {current.evaluation_criteria.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {current.evaluation_criteria.map((c, i) => (
                  <span
                    key={i}
                    className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-medium text-indigo-800"
                  >
                    {c.name} : {c.weight}
                  </span>
                ))}
              </div>
            )}
          </div>

          <ComplianceChecklist
            checklist={current.compliance_checklist}
            flaggedFinancialLegal={current.flagged_financial_legal}
            onToggleItem={handleToggleChecklist}
          />

          <div className="space-y-4">
            <h3 className="text-base font-semibold text-slate-900">
              Éditeur côte à côte — Mémoire Technique ({current.memoire_sections.length} sections)
            </h3>
            {current.memoire_sections.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">
                Importez un DCE ci-dessus pour extraire les critères du RC/CCTP et générer le plan du mémoire technique.
              </div>
            ) : (
              current.memoire_sections.map((sec) => (
                <SectionEditor
                  key={sec.id}
                  section={sec}
                  regenerating={regeneratingId === sec.id}
                  onChangeDraft={handleChangeDraft}
                  onRegenerate={handleRegenerate}
                />
              ))
            )}
          </div>
        </>
      ) : (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">
          Créez un dossier ci-dessus ou sélectionnez un avis depuis l&apos;onglet{" "}
          <strong>Veille BOAMP</strong>.
        </div>
      )}
    </div>
  );
}
