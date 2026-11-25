"use client";

import { useEffect, useState } from "react";
import {
  Database,
  FileText,
  Lock,
  LogOut,
  Radar,
  ShieldAlert,
} from "lucide-react";
import {
  apiFetch,
  getStoredToken,
  setStoredToken,
  type TenderNotice,
  type TenderWorkspace,
} from "@/lib/api";
import { UI_TEXT, type Lang } from "@/lib/i18n";
import { KnowledgeBaseView } from "@/components/KnowledgeBaseView";
import { VeilleFeed } from "@/components/VeilleFeed";
import { WorkspaceView } from "@/components/WorkspaceView";

type Tab = "veille" | "workspace" | "kb";

function LangToggle({
  lang,
  onChange,
}: {
  lang: Lang;
  onChange: (next: Lang) => void;
}) {
  return (
    <div
      className="inline-flex overflow-hidden rounded-lg border border-slate-200 bg-slate-100 text-xs font-bold"
      role="group"
      aria-label="Language switch"
    >
      <button
        type="button"
        onClick={() => onChange("fr")}
        className={`px-2.5 py-1 transition ${
          lang === "fr"
            ? "bg-blue-700 text-white"
            : "text-slate-600 hover:text-slate-900"
        }`}
      >
        FR
      </button>
      <button
        type="button"
        onClick={() => onChange("en")}
        className={`px-2.5 py-1 transition ${
          lang === "en"
            ? "bg-blue-700 text-white"
            : "text-slate-600 hover:text-slate-900"
        }`}
      >
        EN
      </button>
    </div>
  );
}

export default function HomePage() {
  const [lang, setLang] = useState<Lang>("fr");
  const [authenticated, setAuthenticated] = useState(false);
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>("veille");
  const [activeWorkspaceId, setActiveWorkspaceId] = useState<number | null>(null);

  const t = UI_TEXT[lang];

  useEffect(() => {
    if (getStoredToken()) {
      setAuthenticated(true);
    }
    const savedLang = localStorage.getItem("fta_lang");
    if (savedLang === "en" || savedLang === "fr") {
      setLang(savedLang);
    }
  }, []);

  function handleChangeLang(next: Lang) {
    setLang(next);
    localStorage.setItem("fta_lang", next);
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoginError(null);
    try {
      const res = await apiFetch<{ access_token: string }>("/auth/login", {
        method: "POST",
        body: JSON.stringify({ username, password }),
      });
      setStoredToken(res.access_token);
      setAuthenticated(true);
      setPassword("");
    } catch {
      setLoginError(t.badCredentials);
    }
  }

  function handleLogout() {
    setStoredToken(null);
    setAuthenticated(false);
  }

  async function handleOpenWorkspaceForTender(tender: TenderNotice) {
    const ws = await apiFetch<TenderWorkspace>("/workspaces", {
      method: "POST",
      body: JSON.stringify({
        title: tender.title,
        buyer_name: tender.buyer_name,
        reference_code: tender.boamp_id,
        tender_notice_id: tender.id,
      }),
    });
    setActiveWorkspaceId(ws.id);
    setActiveTab("workspace");
  }

  if (!authenticated) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-900 p-4">
        <form
          onSubmit={handleLogin}
          className="w-full max-w-md rounded-2xl border border-slate-700 bg-white p-8 shadow-xl"
        >
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-blue-700">
              <Lock className="h-5 w-5" />
              <span className="text-xs font-bold uppercase tracking-wider">
                {t.protectedAccess}
              </span>
            </div>
            <LangToggle lang={lang} onChange={handleChangeLang} />
          </div>
          <h1 className="mt-2 text-2xl font-bold text-slate-900">
            Marchés Publics AI
          </h1>
          <p className="mt-1 text-sm text-slate-500">{t.loginSubtitle}</p>

          <div className="mt-6 space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700">
                {t.username}
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700">
                {t.password}
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
            {loginError && (
              <p className="rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-700">
                {loginError}
              </p>
            )}
            <button
              type="submit"
              className="w-full rounded-lg bg-blue-700 py-2.5 text-sm font-semibold text-white hover:bg-blue-800"
            >
              {t.signIn}
            </button>
          </div>
        </form>
      </main>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-3">
          <div>
            <h1 className="text-lg font-bold text-slate-900">{t.appTitle}</h1>
            <p className="text-xs text-slate-500">{t.appSubtitle}</p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveTab("veille")}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold ${
                activeTab === "veille"
                  ? "bg-blue-700 text-white"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              <Radar className="h-4 w-4" />
              {t.tabVeille}
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("workspace")}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold ${
                activeTab === "workspace"
                  ? "bg-blue-700 text-white"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              <FileText className="h-4 w-4" />
              {t.tabWorkspace}
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("kb")}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold ${
                activeTab === "kb"
                  ? "bg-blue-700 text-white"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              <Database className="h-4 w-4" />
              {t.tabKb}
            </button>

            <div className="ml-1">
              <LangToggle lang={lang} onChange={handleChangeLang} />
            </div>

            <button
              type="button"
              onClick={handleLogout}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100"
            >
              <LogOut className="h-3.5 w-3.5" />
              {t.logout}
            </button>
          </div>
        </div>
      </header>

      <div className="border-b border-amber-200 bg-amber-50">
        <div className="mx-auto flex max-w-7xl items-center gap-2.5 px-4 py-2 text-xs text-amber-900">
          <ShieldAlert className="h-4 w-4 shrink-0 text-amber-700" />
          <span>
            <strong>{t.guardrailLead}</strong> {t.guardrailBody}
          </span>
        </div>
      </div>

      <main className="mx-auto max-w-7xl px-4 py-6">
        {activeTab === "veille" && (
          <VeilleFeed
            lang={lang}
            onOpenWorkspaceForTender={handleOpenWorkspaceForTender}
          />
        )}
        {activeTab === "workspace" && (
          <WorkspaceView
            lang={lang}
            activeWorkspaceId={activeWorkspaceId}
            onSelectWorkspace={setActiveWorkspaceId}
          />
        )}
        {activeTab === "kb" && <KnowledgeBaseView lang={lang} />}
      </main>
    </div>
  );
}
