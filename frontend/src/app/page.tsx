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
import { KnowledgeBaseView } from "@/components/KnowledgeBaseView";
import { VeilleFeed } from "@/components/VeilleFeed";
import { WorkspaceView } from "@/components/WorkspaceView";

type Tab = "veille" | "workspace" | "kb";

export default function HomePage() {
  const [authenticated, setAuthenticated] = useState(false);
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>("veille");
  const [activeWorkspaceId, setActiveWorkspaceId] = useState<number | null>(null);

  useEffect(() => {
    if (getStoredToken()) {
      setAuthenticated(true);
    }
  }, []);

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
      setLoginError("Identifiants incorrects.");
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
          <div className="flex items-center gap-2 text-blue-700">
            <Lock className="h-5 w-5" />
            <span className="text-xs font-bold uppercase tracking-wider">
              Accès protégé
            </span>
          </div>
          <h1 className="mt-2 text-2xl font-bold text-slate-900">
            Marchés Publics AI
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Veille BOAMP, Analyse DCE & Mémoires Techniques
          </p>

            <div className="mt-6 space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700">
                Identifiant
              </label>
              <input
                type="text"
                autoComplete="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700">
                Mot de passe
              </label>
              <input
                type="password"
                autoComplete="current-password"
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
              Se connecter
            </button>
          </div>
        </form>
      </main>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-20 sm:pb-0">
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3">
          <div>
            <h1 className="text-base sm:text-lg font-bold text-slate-900">
              TRADISTER SASU — Veille Marchés Publics France & UE
            </h1>
            <p className="text-[11px] sm:text-xs text-slate-500">
              BOAMP (France) • TED Europa (UE) • Analyse DCE • RAG pgvector • Export Word (.docx)
            </p>
          </div>

          <div className="flex items-center gap-2">
            <div className="hidden sm:flex items-center gap-2">
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
                Veille France & UE
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
                Espace DCE & Mémoire
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
                Base de Connaissances
              </button>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Déconnexion</span>
            </button>
          </div>
        </div>
      </header>

      {/* Human-in-the-Loop Operational Guardrail Banner */}
      <div className="border-b border-amber-200 bg-amber-50">
        <div className="mx-auto flex max-w-7xl items-center gap-2.5 px-4 py-2 text-xs text-amber-900">
          <ShieldAlert className="h-4 w-4 shrink-0 text-amber-700" />
          <span>
            <strong>Contrôle humain obligatoire :</strong> Vérifiez systématiquement les prix du{" "}
            <strong>BPU/DPGF</strong>, joignez vos{" "}
            <strong>attestations fiscales et sociales à jour</strong>, et réalisez la{" "}
            <strong>signature électronique (RGS / eIDAS)</strong> ainsi que le dépôt final
            manuellement sur le profil acheteur (PLACE, Maximilien, AWS).
          </span>
        </div>
      </div>

      <main className="mx-auto max-w-7xl px-4 py-5 sm:py-6">
        {activeTab === "veille" && (
          <VeilleFeed onOpenWorkspaceForTender={handleOpenWorkspaceForTender} />
        )}
        {activeTab === "workspace" && (
          <WorkspaceView
            activeWorkspaceId={activeWorkspaceId}
            onSelectWorkspace={setActiveWorkspaceId}
          />
        )}
        {activeTab === "kb" && <KnowledgeBaseView />}
      </main>

      {/* Mobile PWA Bottom Navigation */}
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 backdrop-blur sm:hidden">
        <div className="grid grid-cols-3 text-center">
          <button
            type="button"
            onClick={() => setActiveTab("veille")}
            className={`flex flex-col items-center justify-center gap-1 py-2.5 text-[11px] font-semibold ${
              activeTab === "veille" ? "text-blue-700" : "text-slate-500"
            }`}
          >
            <Radar className="h-5 w-5" />
            Veille FR/UE
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("workspace")}
            className={`flex flex-col items-center justify-center gap-1 py-2.5 text-[11px] font-semibold ${
              activeTab === "workspace" ? "text-blue-700" : "text-slate-500"
            }`}
          >
            <FileText className="h-5 w-5" />
            Espace DCE
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("kb")}
            className={`flex flex-col items-center justify-center gap-1 py-2.5 text-[11px] font-semibold ${
              activeTab === "kb" ? "text-blue-700" : "text-slate-500"
            }`}
          >
            <Database className="h-5 w-5" />
            Base RAG
          </button>
        </div>
      </nav>
    </div>
  );
}
