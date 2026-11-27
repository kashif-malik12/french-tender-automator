"use client";

import { useEffect, useState } from "react";
import {
  Building2,
  CheckCheck,
  Globe2,
  RefreshCw,
  Save,
  SlidersHorizontal,
} from "lucide-react";
import { apiFetch, type CompanyProfile, type TenderNotice } from "@/lib/api";
import { getCpvLabel, UI_TEXT, type Lang } from "@/lib/i18n";
import { GoNoGoCard } from "./GoNoGoCard";

interface Props {
  lang: Lang;
  onOpenWorkspaceForTender: (tender: TenderNotice) => void;
}

type RegionFilter = "ALL" | "FR" | "EU";
type TriageFilter = "UNSEEN" | "FAVORITES" | "SEEN" | "ALL";
type SortMode = "fit" | "post_desc" | "post_asc" | "deadline_asc" | "amount_desc" | "amount_asc";
const PAGE_SIZE = 50;

export function VeilleFeed({ lang, onOpenWorkspaceForTender }: Props) {
  const t = UI_TEXT[lang];
  const locale = lang === "fr" ? "fr-FR" : "en-GB";
  const [tenders, setTenders] = useState<TenderNotice[]>([]);
  const [profile, setProfile] = useState<CompanyProfile | null>(null);
  const [deptsInput, setDeptsInput] = useState("");
  const [cpvInput, setCpvInput] = useState("");
  const [kwInput, setKwInput] = useState("");
  const [triageFilter, setTriageFilter] = useState<TriageFilter>("UNSEEN");
  const [regionFilter, setRegionFilter] = useState<RegionFilter>("ALL");
  const [sortMode, setSortMode] = useState<SortMode>("fit");
  const [minScoreFilter, setMinScoreFilter] = useState<number>(50);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [showFilters, setShowFilters] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function loadAll(overrideRegion?: RegionFilter, overrideMinScore?: number) {
    const activeRegion = overrideRegion ?? regionFilter;
    const params = new URLSearchParams({ limit: "300", only_relevant: "true", only_open: "true" });
    if (activeRegion !== "ALL") {
      params.set("region", activeRegion);
    }
    if (overrideMinScore !== undefined) {
      params.set("min_score", String(overrideMinScore));
    }

    const [p, list] = await Promise.all([
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
    setTenders(list);
  }

  useEffect(() => {
    loadAll().catch((e) => setMessage(String(e)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleRegionChange(next: RegionFilter) {
    setRegionFilter(next);
    setCurrentPage(1);
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
      setCurrentPage(1);
      await loadAll(regionFilter, minScoreFilter);
      setMessage(t.profileSaved);
    } catch (err) {
      setMessage(String(err));
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
      setCurrentPage(1);
      await loadAll(regionFilter, minScoreFilter);
      setMessage(
        lang === "en"
          ? `FR & EU sync complete: ${res.fr_fetched} France + ${res.eu_fetched} EU analyzed → ${res.inserted} new, ${res.updated} updated (${res.filtered_out} out-of-scope filtered).`
          : `Veille FR & UE terminée : ${res.fr_fetched} France + ${res.eu_fetched} UE analysés → ${res.inserted} nouveaux, ${res.updated} mis à jour (${res.filtered_out} hors périmètre filtrés).`
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
    if (status === "archived") {
      setTenders((prev) => prev.filter((item) => item.id !== id));
    } else {
      setTenders((prev) => prev.map((item) => (item.id === id ? updated : item)));
    }
  }

  // Unseen = "new"; Favorites = "shortlisted" | "in_progress"; Seen = favorites + "seen" | "rejected"
  const unseenPool = tenders.filter((item) => item.status === "new");
  const favPool = tenders.filter(
    (item) => item.status === "shortlisted" || item.status === "in_progress"
  );
  const seenPool = tenders.filter((item) => item.status !== "new");

  const visibleTenders =
    triageFilter === "UNSEEN"
      ? unseenPool
      : triageFilter === "FAVORITES"
        ? favPool
        : triageFilter === "SEEN"
          ? seenPool
          : tenders;

  const sortedVisible = [...visibleTenders].sort((a, b) => {
    if (sortMode === "post_desc") {
      return (b.publication_date || "").localeCompare(a.publication_date || "");
    }
    if (sortMode === "post_asc") {
      return (a.publication_date || "9999").localeCompare(b.publication_date || "9999");
    }
    if (sortMode === "deadline_asc") {
      return (a.deadline_date || "9999").localeCompare(b.deadline_date || "9999");
    }
    if (sortMode === "amount_desc") {
      return (b.estimated_amount ?? -1) - (a.estimated_amount ?? -1);
    }
    if (sortMode === "amount_asc") {
      const av = a.estimated_amount && a.estimated_amount > 0 ? a.estimated_amount : Number.MAX_SAFE_INTEGER;
      const bv = b.estimated_amount && b.estimated_amount > 0 ? b.estimated_amount : Number.MAX_SAFE_INTEGER;
      return av - bv;
    }
    if (a.region !== b.region) return a.region === "FR" ? -1 : 1;
    if ((b.go_no_go_score ?? 0) !== (a.go_no_go_score ?? 0)) {
      return (b.go_no_go_score ?? 0) - (a.go_no_go_score ?? 0);
    }
    return (a.deadline_date || "9999").localeCompare(b.deadline_date || "9999");
  });

  const totalPages = Math.max(1, Math.ceil(sortedVisible.length / PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);
  const pageItems = sortedVisible.slice(
    (safePage - 1) * PAGE_SIZE,
    safePage * PAGE_SIZE
  );

  async function handleMarkPageSeen() {
    const ids = pageItems
      .filter((item) => item.status === "new")
      .map((item) => item.id);
    if (!ids.length) return;
    await apiFetch("/tenders/mark-seen", {
      method: "POST",
      body: JSON.stringify({ tender_ids: ids }),
    });
    const idSet = new Set(ids);
    setTenders((prev) =>
      prev.map((item) => (idSet.has(item.id) ? { ...item, status: "seen" } : item))
    );
  }

  const franceTenders = pageItems.filter((item) => item.region === "FR");
  const euTenders = pageItems.filter((item) => item.region === "EU");
  const frTotal = visibleTenders.filter((item) => item.region === "FR").length;
  const euTotal = visibleTenders.filter((item) => item.region === "EU").length;
  const urgentCount = visibleTenders.filter(
    (item) =>
      item.days_remaining !== null &&
      item.days_remaining !== undefined &&
      item.days_remaining >= 0 &&
      item.days_remaining <= 14
  ).length;
  const avgScore =
    visibleTenders.length > 0
      ? Math.round(
          visibleTenders.reduce((acc, item) => acc + (item.go_no_go_score ?? 0), 0) /
            visibleTenders.length
        )
      : 0;

  const renderPager = () =>
    visibleTenders.length > PAGE_SIZE ? (
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs text-slate-600 shadow-sm">
        <span>
          {t.showingLabel}{" "}
          <strong>
            {(safePage - 1) * PAGE_SIZE + 1}–{Math.min(visibleTenders.length, safePage * PAGE_SIZE)}
          </strong>{" "}
          {t.ofLabel} <strong>{visibleTenders.length}</strong> ({t.pageLabel} {safePage}/{totalPages})
        </span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={safePage <= 1}
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            className="rounded-lg border border-slate-200 px-3 py-1.5 font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40"
          >
            {t.prev50}
          </button>
          <button
            type="button"
            disabled={safePage >= totalPages}
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            className="rounded-lg border border-slate-200 px-3 py-1.5 font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40"
          >
            {t.next50}
          </button>
        </div>
      </div>
    ) : null;

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
              {profile?.tva_number ? `${t.vatLabel} ${profile.tva_number}` : ""}
              {profile?.address ? `${profile?.tva_number ? " • " : ""}${profile.address}` : ""}
            </p>
            <p className="text-xs text-slate-500">
              {t.targetAmountLabel}{" "}
              <strong>
                {profile?.min_target_amount ? `${profile.min_target_amount.toLocaleString(locale)} €` : "0 €"} –{" "}
                {profile?.max_target_amount ? `${profile.max_target_amount.toLocaleString(locale)} €` : t.unlimited}
              </strong>{" "}
              • {t.scopeLabel}{" "}
              <strong>
                {profile?.include_all_france ? t.allFranceScope : t.deptScope}{" "}
                {profile?.include_eu ? t.andEuScope : ""}
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
              {showFilters ? t.hideFilters : t.showFilters}
            </button>
            <button
              type="button"
              disabled={syncing}
              onClick={handleSyncTenders}
              className="inline-flex items-center gap-1.5 rounded-lg bg-blue-700 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-blue-800 disabled:opacity-60"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${syncing ? "animate-spin" : ""}`} />
              {syncing ? t.syncingBtn : t.syncBtn}
            </button>
          </div>
        </div>

        {showFilters && profile && (
          <form onSubmit={handleSaveProfile} className="mt-4 border-t border-slate-100 pt-4">
            <div className="grid gap-3 md:grid-cols-3">
              <div>
                <label className="block text-xs font-medium text-slate-600">{t.companyLabel}</label>
                <input
                  type="text"
                  value={profile.name}
                  onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600">{t.presidentField}</label>
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
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {cpvInput
                    .split(",")
                    .map((s) => s.trim())
                    .filter(Boolean)
                    .map((code) => {
                      const lbl = getCpvLabel(code, lang);
                      return (
                        <span
                          key={code}
                          className="rounded border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] text-slate-700"
                        >
                          <strong>{code}</strong>
                          {lbl ? ` — ${lbl}` : ""}
                        </span>
                      );
                    })}
                </div>
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
              <div>
                <label className="block text-xs font-medium text-slate-600">{t.minAmtLabel}</label>
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
                <label className="block text-xs font-medium text-slate-600">{t.maxAmtLabel}</label>
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
                  {t.minScoreLabel} ({minScoreFilter}/100)
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

            {profile.excluded_criteria && profile.excluded_criteria.length > 0 && (
              <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50/70 p-3">
                <div className="text-xs font-semibold text-amber-900">{t.excludedHeading}</div>
                <p className="mt-0.5 text-[11px] text-amber-800">{t.excludedHint}</p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {profile.excluded_criteria.map((item) => (
                    <span
                      key={item}
                      className="rounded-md border border-amber-200 bg-white px-2 py-0.5 text-[11px] text-slate-700"
                    >
                      {item}
                    </span>
                  ))}
                </div>
              </div>
            )}

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
                  {t.includeAllFrance}
                </label>
                <label className="inline-flex items-center gap-1.5">
                  <input
                    type="checkbox"
                    checked={profile.include_eu}
                    onChange={(e) => setProfile({ ...profile, include_eu: e.target.checked })}
                  />
                  {t.includeEu}
                </label>
              </div>
              <button
                type="submit"
                disabled={savingProfile}
                className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-slate-800"
              >
                <Save className="h-3.5 w-3.5" />
                {t.saveFilters}
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

      {/* KPI Strip */}
      <div className="grid gap-3 sm:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="text-xs text-slate-500">{t.kpiRelevant}</div>
          <div className="mt-1 text-2xl font-bold text-slate-900">{visibleTenders.length}</div>
        </div>
        <div className="rounded-xl border border-blue-200 bg-blue-50/50 p-4 shadow-sm">
          <div className="text-xs text-blue-700">{t.kpiFr}</div>
          <div className="mt-1 text-2xl font-bold text-blue-900">{frTotal}</div>
        </div>
        <div className="rounded-xl border border-indigo-200 bg-indigo-50/50 p-4 shadow-sm">
          <div className="text-xs text-indigo-700">{t.kpiEu}</div>
          <div className="mt-1 text-2xl font-bold text-indigo-900">{euTotal}</div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="text-xs text-slate-500">{t.kpiAvgUrgent}</div>
          <div className="mt-1 text-2xl font-bold text-slate-900">
            {avgScore}/100 <span className="text-sm font-medium text-rose-700">• {urgentCount} {t.urgentShort}</span>
          </div>
        </div>
      </div>

      {/* Triage / Screening Tabs (Unseen / Favorites / Seen / All) */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {(
            [
              { id: "UNSEEN", label: `🆕 ${t.triageUnseen}`, count: unseenPool.length },
              { id: "FAVORITES", label: `⭐ ${t.triageFavorites}`, count: favPool.length },
              { id: "SEEN", label: `👁️ ${t.triageSeen}`, count: seenPool.length },
              { id: "ALL", label: `📋 ${t.triageAll}`, count: tenders.length },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => {
                setTriageFilter(tab.id);
                setCurrentPage(1);
              }}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                triageFilter === tab.id
                  ? tab.id === "FAVORITES"
                    ? "bg-amber-600 text-white"
                    : "bg-slate-900 text-white"
                  : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
              }`}
            >
              <span>{tab.label}</span>
              <span
                className={`rounded-full px-1.5 py-0.5 text-[10px] ${
                  triageFilter === tab.id ? "bg-white/20 text-white" : "bg-slate-100 text-slate-600"
                }`}
              >
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {triageFilter === "UNSEEN" && pageItems.length > 0 && (
          <button
            type="button"
            onClick={handleMarkPageSeen}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
          >
            <CheckCheck className="h-3.5 w-3.5" />
            {t.markVisibleSeen}
          </button>
        )}
      </div>

      {/* Region Filter + Sort Selector */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {(
            [
              { id: "ALL", label: t.regionAll },
              { id: "FR", label: t.regionFr },
              { id: "EU", label: t.regionEu },
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

        <select
          value={sortMode}
          onChange={(e) => {
            setSortMode(e.target.value as SortMode);
            setCurrentPage(1);
          }}
          className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700"
        >
          <option value="fit">{t.sortFit}</option>
          <option value="post_desc">{t.sortPostDesc}</option>
          <option value="post_asc">{t.sortPostAsc}</option>
          <option value="deadline_asc">{t.sortDeadlineAsc}</option>
          <option value="amount_desc">{t.sortAmountDesc}</option>
          <option value="amount_asc">{t.sortAmountAsc}</option>
        </select>
      </div>

      {pageItems.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">
          {triageFilter === "UNSEEN" && tenders.length > 0 ? t.emptyUnseen : t.emptyTenders}
        </div>
      ) : (
        <div className="space-y-6">
          {renderPager()}
          {(regionFilter === "ALL" || regionFilter === "FR") && franceTenders.length > 0 && (
            <section className="space-y-3">
              <div className="flex items-center justify-between border-b border-blue-200 pb-2">
                <h3 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-blue-900">
                  <Globe2 className="h-4 w-4 text-blue-700" />
                  {t.frSectionTitle} ({franceTenders.length}/{frTotal})
                </h3>
                <span className="text-xs text-slate-500">{t.frSectionSub}</span>
              </div>
              {franceTenders.map((item) => (
                <GoNoGoCard
                  key={item.id}
                  lang={lang}
                  tender={item}
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
                  {t.euSectionTitle} ({euTenders.length}/{euTotal})
                </h3>
                <span className="text-xs text-slate-500">{t.euSectionSub}</span>
              </div>
              {euTenders.map((item) => (
                <GoNoGoCard
                  key={item.id}
                  lang={lang}
                  tender={item}
                  onStatusChange={handleStatusChange}
                  onCreateWorkspace={onOpenWorkspaceForTender}
                />
              ))}
            </section>
          )}
          {renderPager()}
        </div>
      )}
    </div>
  );
}
