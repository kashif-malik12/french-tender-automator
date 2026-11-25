"use client";

import { useEffect, useState } from "react";
import { RefreshCw, Save, SlidersHorizontal } from "lucide-react";
import { apiFetch, type CompanyProfile, type TenderNotice } from "@/lib/api";
import { UI_TEXT, type Lang } from "@/lib/i18n";
import { GoNoGoCard } from "./GoNoGoCard";

interface Props {
  lang: Lang;
  onOpenWorkspaceForTender: (tender: TenderNotice) => void;
}

export function VeilleFeed({ lang, onOpenWorkspaceForTender }: Props) {
  const t = UI_TEXT[lang];
  const [tenders, setTenders] = useState<TenderNotice[]>([]);
  const [profile, setProfile] = useState<CompanyProfile | null>(null);
  const [deptsInput, setDeptsInput] = useState("");
  const [cpvInput, setCpvInput] = useState("");
  const [kwInput, setKwInput] = useState("");
  const [syncing, setSyncing] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function loadAll() {
    const [p, list] = await Promise.all([
      apiFetch<CompanyProfile>("/profile"),
      apiFetch<TenderNotice[]>("/tenders?limit=50"),
    ]);
    setProfile(p);
    setDeptsInput((p.target_departments || []).join(", "));
    setCpvInput((p.target_cpv_codes || []).join(", "));
    setKwInput((p.target_keywords || []).join(", "));
    setTenders(list);
  }

  useEffect(() => {
    loadAll().catch((e) => setMessage(String(e)));
  }, []);

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    if (!profile) return;
    setSavingProfile(true);
    setMessage(null);
    try {
      const updated = await apiFetch<CompanyProfile>("/profile", {
        method: "PUT",
        body: JSON.stringify({
          ...profile,
          target_departments: deptsInput.split(",").map((s) => s.trim()).filter(Boolean),
          target_cpv_codes: cpvInput.split(",").map((s) => s.trim()).filter(Boolean),
          target_keywords: kwInput.split(",").map((s) => s.trim()).filter(Boolean),
        }),
      });
      setProfile(updated);
      setMessage(t.profileSaved);
    } catch (err) {
      setMessage(String(err));
    } finally {
      setSavingProfile(false);
    }
  }

  async function handleSyncBoamp() {
    setSyncing(true);
    setMessage(null);
    try {
      const res = await apiFetch<{ fetched: number; inserted: number; updated: number }>(
        "/tenders/sync",
        {
          method: "POST",
          body: JSON.stringify({ limit: 20, async_mode: false }),
        }
      );
      await loadAll();
      setMessage(
        lang === "fr"
          ? `Synchronisation BOAMP terminée : ${res.fetched} avis récupérés (${res.inserted} nouveaux, ${res.updated} mis à jour).`
          : `BOAMP sync complete: ${res.fetched} notices fetched (${res.inserted} new, ${res.updated} updated).`
      );
    } catch (err) {
      setMessage(String(err));
    } finally {
      setSyncing(false);
    }
  }

  async function handleStatusChange(id: number, status: string) {
    const updated = await apiFetch<TenderNotice>(`/tenders/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    });
    setTenders((prev) => prev.map((item) => (item.id === id ? updated : item)));
  }

  return (
    <div className="space-y-6">
      <form
        onSubmit={handleSaveProfile}
        className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="h-4 w-4 text-blue-700" />
            <h2 className="text-base font-semibold text-slate-900">{t.veilleTitle}</h2>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="submit"
              disabled={savingProfile}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              <Save className="h-3.5 w-3.5" />
              {t.saveFilters}
            </button>
            <button
              type="button"
              disabled={syncing}
              onClick={handleSyncBoamp}
              className="inline-flex items-center gap-1.5 rounded-lg bg-blue-700 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-blue-800 disabled:opacity-60"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${syncing ? "animate-spin" : ""}`} />
              {syncing ? t.syncingBoamp : t.syncBoamp}
            </button>
          </div>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-4">
          <div>
            <label className="block text-xs font-medium text-slate-600">{t.companyLabel}</label>
            <input
              type="text"
              value={profile?.name || ""}
              onChange={(e) =>
                setProfile((p) => (p ? { ...p, name: e.target.value } : p))
              }
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600">{t.deptsLabel}</label>
            <input
              type="text"
              value={deptsInput}
              onChange={(e) => setDeptsInput(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600">{t.cpvLabel}</label>
            <input
              type="text"
              value={cpvInput}
              onChange={(e) => setCpvInput(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600">{t.kwLabel}</label>
            <input
              type="text"
              value={kwInput}
              onChange={(e) => setKwInput(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
            />
          </div>
        </div>

        {message && (
          <p className="mt-3 rounded-lg bg-slate-100 px-3 py-2 text-xs text-slate-700">
            {message}
          </p>
        )}
      </form>

      <div className="space-y-3">
        {tenders.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">
            {t.emptyTenders}
          </div>
        ) : (
          tenders.map((item) => (
            <GoNoGoCard
              key={item.id}
              lang={lang}
              tender={item}
              onStatusChange={handleStatusChange}
              onCreateWorkspace={onOpenWorkspaceForTender}
            />
          ))
        )}
      </div>
    </div>
  );
}
