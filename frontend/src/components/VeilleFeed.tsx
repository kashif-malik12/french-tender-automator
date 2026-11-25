"use client";

import { useEffect, useState } from "react";
import {
  Building2,
  Globe2,
  RefreshCw,
  Save,
  SlidersHorizontal,
} from "lucide-react";
import { apiFetch, type CompanyProfile, type TenderNotice } from "@/lib/api";
import { GoNoGoCard } from "./GoNoGoCard";

interface Props {
  onOpenWorkspaceForTender: (tender: TenderNotice) => void;
}

type RegionFilter = "ALL" | "FR" | "EU";

export function VeilleFeed({ onOpenWorkspaceForTender }: Props) {
  const [tenders, setTenders] = useState<TenderNotice[]>([]);
  const [profile, setProfile] = useState<CompanyProfile | null>(null);
  const [deptsInput, setDeptsInput] = useState("");
  const [cpvInput, setCpvInput] = useState("");
  const [kwInput, setKwInput] = useState("");
  const [regionFilter, setRegionFilter] = useState<RegionFilter>("ALL");
  const [minScoreFilter, setMinScoreFilter] = useState<number>(50);
  const [showFilters, setShowFilters] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function loadAll(overrideRegion?: RegionFilter, overrideMinScore?: number) {
    const activeRegion = overrideRegion ?? regionFilter;
    const params = new URLSearchParams({ limit: "150", only_relevant: "true", only_open: "true" });
    if (activeRegion !== "ALL") {
      params.set("region", activeRegion);
    }
    if (overrideMinScore !== undefined) {
      params.set("min_score", String(overrideMinScore));
    }

    const [p, t] = await Promise.all([
      apiFetch<CompanyProfile>("/profile"),
      apiFetch<TenderNotice[]>(`/tenders?${params.toString()}`),
    ]);
    setProfile(p);
    setDeptsInput((p.target_departments || []).join(", "));
    setCpvInput((p.target_cpv_codes || []).join(", "));
    setKwInput((p.target_keywords || []).join(", "));
    if (overrideMinScore === undefined) {
      setMinScoreFilter(p.min_suitability_score ?? 50);
    }
    setTenders(t);
  }

  useEffect(() => {
    loadAll().catch((e) => setMessage(String(e)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleRegionChange(next: RegionFilter) {
    setRegionFilter(next);
    await loadAll(next, minScoreFilter);
  }

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
          min_suitability_score: minScoreFilter,
          target_departments: deptsInput.split(",").map((s) => s.trim()).filter(Boolean),
          target_cpv_codes: cpvInput.split(",").map((s) => s.trim()).filter(Boolean),
          target_keywords: kwInput.split(",").map((s) => s.trim()).filter(Boolean),
        }),
      });
      setProfile(updated);
      await loadAll(regionFilter, minScoreFilter);
      setMessage("Profil TRADISTER SASU et critères de pertinence enregistrés.");
    } catch (err) {
      setMessage(`Erreur : ${String(err)}`);
    } finally {
      setSavingProfile(false);
    }
  }

  async function handleSyncTenders() {
    setSyncing(true);
    setMessage(null);
    try {
      const res = await apiFetch<{
        fetched: number;
        fr_fetched: number;
        eu_fetched: number;
        inserted: number;
        updated: number;
        filtered_out: number;
      }>("/tenders/sync", {
        method: "POST",
        body: JSON.stringify({ limit: 40, eu_limit: 30, include_eu: true, async_mode: false }),
      });
      await loadAll(regionFilter, minScoreFilter);
      setMessage(
        `Veille FR & UE terminée : ${res.fr_fetched} France + ${res.eu_fetched} UE analysés → ${res.inserted} nouveaux, ${res.updated} mis à jour (${res.filtered_out} hors périmètre filtrés).`
      );
    } catch (err) {
      setMessage(`Erreur synchronisation : ${String(err)}`);
    } finally {
      setSyncing(false);
    }
  }

  async function handleStatusChange(id: number, status: string) {
    const updated = await apiFetch<TenderNotice>(`/tenders/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    });
    if (status === "archived") {
      setTenders((prev) => prev.filter((t) => t.id !== id));
    } else {
      setTenders((prev) => prev.map((t) => (t.id === id ? updated : t)));
    }
  }

  const franceTenders = tenders.filter((t) => t.region === "FR");
  const euTenders = tenders.filter((t) => t.region === "EU");
  const urgentCount = tenders.filter(
    (t) => t.days_remaining !== null && t.days_remaining !== undefined && t.days_remaining >= 0 && t.days_remaining <= 14
  ).length;
  const avgScore =
    tenders.length > 0
      ? Math.round(tenders.reduce((acc, t) => acc + (t.go_no_go_score ?? 0), 0) / tenders.length)
      : 0;

  return (
    <div className="space-y-6">
      {/* Company Profile Banner (TRADISTER SASU) */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <Building2 className="h-5 w-5 text-blue-700" />
              <h2 className="text-base font-bold text-slate-900">
                {profile?.name || "TRADISTER SASU"}
              </h2>
              {profile?.naf_code && (
                <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-semibold text-blue-800">
                  NAF {profile.naf_code}
                </span>
              )}
              {profile?.siret && (
                <span className="rounded bg-slate-100 px-2 py-0.5 font-mono text-xs text-slate-700">
                  SIRET {profile.siret}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-600">
              Présidente : <strong>{profile?.president || "Bisma Kashif"}</strong>
              {profile?.tva_number ? ` • TVA ${profile.tva_number}` : ""}
              {profile?.address ? ` • ${profile.address}` : ""}
            </p>
            <p className="text-xs text-slate-500">
              Cible montant :{" "}
              <strong>
                {profile?.min_target_amount ? `${profile.min_target_amount.toLocaleString("fr-FR")} €` : "0 €"} –{" "}
                {profile?.max_target_amount ? `${profile.max_target_amount.toLocaleString("fr-FR")} €` : "Illimité"}
              </strong>{" "}
              • Périmètre :{" "}
              <strong>
                {profile?.include_all_france ? "Toute la France (priorité Île-de-France)" : "Départements cibles"}{" "}
                {profile?.include_eu ? "+ Union Européenne (TED)" : ""}
              </strong>
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setShowFilters((v) => !v)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              <SlidersHorizontal className="h-3.5 w-3.5" />
              {showFilters ? "Masquer critères" : "Modifier critères"}
            </button>
            <button
              type="button"
              disabled={syncing}
              onClick={handleSyncTenders}
              className="inline-flex items-center gap-1.5 rounded-lg bg-blue-700 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-blue-800 disabled:opacity-60"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${syncing ? "animate-spin" : ""}`} />
              {syncing ? "Synchronisation FR & UE..." : "Actualiser France & UE"}
            </button>
          </div>
        </div>

        {showFilters && profile && (
          <form onSubmit={handleSaveProfile} className="mt-4 border-t border-slate-100 pt-4">
            <div className="grid gap-3 md:grid-cols-3">
              <div>
                <label className="block text-xs font-medium text-slate-600">Entreprise</label>
                <input
                  type="text"
                  value={profile.name}
                  onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600">Président(e)</label>
                <input
                  type="text"
                  value={profile.president || ""}
                  onChange={(e) => setProfile({ ...profile, president: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600">SIRET</label>
                <input
                  type="text"
                  value={profile.siret || ""}
                  onChange={(e) => setProfile({ ...profile, siret: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600">
                  Départements prioritaires
                </label>
                <input
                  type="text"
                  value={deptsInput}
                  onChange={(e) => setDeptsInput(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600">Codes CPV cibles</label>
                <input
                  type="text"
                  value={cpvInput}
                  onChange={(e) => setCpvInput(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600">
                  Mots-clés IT / MSP
                </label>
                <input
                  type="text"
                  value={kwInput}
                  onChange={(e) => setKwInput(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600">
                  Montant cible min (€)
                </label>
                <input
                  type="number"
                  value={profile.min_target_amount ?? 0}
                  onChange={(e) =>
                    setProfile({ ...profile, min_target_amount: Number(e.target.value) || 0 })
                  }
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600">
                  Montant cible max (€)
                </label>
                <input
                  type="number"
                  value={profile.max_target_amount ?? 500000}
                  onChange={(e) =>
                    setProfile({ ...profile, max_target_amount: Number(e.target.value) || 0 })
                  }
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600">
                  Score minimum d&apos;adéquation ({minScoreFilter}/100)
                </label>
                <input
                  type="range"
                  min={20}
                  max={85}
                  step={5}
                  value={minScoreFilter}
                  onChange={(e) => setMinScoreFilter(Number(e.target.value))}
                  className="mt-2 w-full"
                />
              </div>
            </div>

            <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-4 text-xs text-slate-700">
                <label className="inline-flex items-center gap-1.5">
                  <input
                    type="checkbox"
                    checked={profile.include_all_france}
                    onChange={(e) =>
                      setProfile({ ...profile, include_all_france: e.target.checked })
                    }
                  />
                  Inclure toute la France
                </label>
                <label className="inline-flex items-center gap-1.5">
                  <input
                    type="checkbox"
                    checked={profile.include_eu}
                    onChange={(e) => setProfile({ ...profile, include_eu: e.target.checked })}
                  />
                  Inclure l&apos;Union Européenne (TED)
                </label>
              </div>
              <button
                type="submit"
                disabled={savingProfile}
                className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-slate-800"
              >
                <Save className="h-3.5 w-3.5" />
                Enregistrer & Recalculer
              </button>
            </div>
          </form>
        )}

        {message && (
          <p className="mt-3 rounded-lg bg-slate-100 px-3 py-2 text-xs text-slate-700">
            {message}
          </p>
        )}
      </div>

      {/* KPI Strip + Region Filter */}
      <div className="grid gap-3 sm:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="text-xs text-slate-500">Marchés pertinents</div>
          <div className="mt-1 text-2xl font-bold text-slate-900">{tenders.length}</div>
        </div>
        <div className="rounded-xl border border-blue-200 bg-blue-50/50 p-4 shadow-sm">
          <div className="text-xs text-blue-700">France (BOAMP + TED FR)</div>
          <div className="mt-1 text-2xl font-bold text-blue-900">{franceTenders.length}</div>
        </div>
        <div className="rounded-xl border border-indigo-200 bg-indigo-50/50 p-4 shadow-sm">
          <div className="text-xs text-indigo-700">Union Européenne (TED)</div>
          <div className="mt-1 text-2xl font-bold text-indigo-900">{euTenders.length}</div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="text-xs text-slate-500">Adéquation moy. / Urgents (≤14j)</div>
          <div className="mt-1 text-2xl font-bold text-slate-900">
            {avgScore}/100 <span className="text-sm font-medium text-rose-700">• {urgentCount} urg.</span>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {(
            [
              { id: "ALL", label: "France puis UE (Tous)" },
              { id: "FR", label: "France uniquement" },
              { id: "EU", label: "Union Européenne uniquement" },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => handleRegionChange(tab.id)}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                regionFilter === tab.id
                  ? "bg-blue-700 text-white"
                  : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {tenders.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">
          Aucun appel d&apos;offres pertinent trouvé avec ces critères. Cliquez sur{" "}
          <strong>Actualiser France & UE</strong> pour récupérer les avis ouverts pour{" "}
          <strong>TRADISTER SASU</strong>.
        </div>
      ) : (
        <div className="space-y-8">
          {(regionFilter === "ALL" || regionFilter === "FR") && franceTenders.length > 0 && (
            <section className="space-y-3">
              <div className="flex items-center justify-between border-b border-blue-200 pb-2">
                <h3 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-blue-900">
                  <Globe2 className="h-4 w-4 text-blue-700" />
                  1. Appels d&apos;offres pertinents en France ({franceTenders.length})
                </h3>
                <span className="text-xs text-slate-500">
                  Triés par adéquation pour TRADISTER SASU puis date limite
                </span>
              </div>
              {franceTenders.map((t) => (
                <GoNoGoCard
                  key={t.id}
                  tender={t}
                  onStatusChange={handleStatusChange}
                  onCreateWorkspace={onOpenWorkspaceForTender}
                />
              ))}
            </section>
          )}

          {(regionFilter === "ALL" || regionFilter === "EU") && euTenders.length > 0 && (
            <section className="space-y-3">
              <div className="flex items-center justify-between border-b border-indigo-200 pb-2">
                <h3 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-indigo-900">
                  <Globe2 className="h-4 w-4 text-indigo-700" />
                  2. Appels d&apos;offres pertinents en Union Européenne ({euTenders.length})
                </h3>
                <span className="text-xs text-slate-500">
                  Source TED Europa • Marchés IT/Cloud/Cybersécurité ouverts
                </span>
              </div>
              {euTenders.map((t) => (
                <GoNoGoCard
                  key={t.id}
                  tender={t}
                  onStatusChange={handleStatusChange}
                  onCreateWorkspace={onOpenWorkspaceForTender}
                />
              ))}
            </section>
          )}
        </div>
      )}
    </div>
  );
}
