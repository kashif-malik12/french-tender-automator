"use client";

import { useEffect, useState } from "react";
import { Search, Trash2, Upload } from "lucide-react";
import { apiFetch, type KnowledgeDocument } from "@/lib/api";
import { UI_TEXT, type Lang } from "@/lib/i18n";

const CATEGORY_LABELS: Record<Lang, Array<{ value: string; label: string }>> = {
  fr: [
    { value: "methodology", label: "Méthodologie & Mémoires gagnants" },
    { value: "team", label: "Équipe & CV" },
    { value: "equipment", label: "Moyens matériels & techniques" },
    { value: "references", label: "Références & Attestations" },
    { value: "rse_environment", label: "RSE, Environnement, ISO/RGE/MASE" },
  ],
  en: [
    { value: "methodology", label: "Methodology & Winning Proposals" },
    { value: "team", label: "Team & CVs" },
    { value: "equipment", label: "Equipment & Technical Means" },
    { value: "references", label: "References & Certificates" },
    { value: "rse_environment", label: "CSR, Environment, ISO/RGE/MASE" },
  ],
};

export function KnowledgeBaseView({ lang }: { lang: Lang }) {
  const t = UI_TEXT[lang];
  const categories = CATEGORY_LABELS[lang];
  const [docs, setDocs] = useState<KnowledgeDocument[]>([]);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("methodology");
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<
    Array<{
      chunk_id: number;
      document_title: string;
      category: string;
      similarity: number;
      content: string;
    }>
  >([]);

  async function loadDocs() {
    const data = await apiFetch<KnowledgeDocument[]>("/knowledge-base");
    setDocs(data);
  }

  useEffect(() => {
    loadDocs().catch(console.error);
  }, []);

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault();
    if (!file) return;
    setUploading(true);
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("title", title);
      form.append("category", category);
      await apiFetch<KnowledgeDocument>("/knowledge-base/upload", {
        method: "POST",
        body: form,
      });
      setTitle("");
      setFile(null);
      await loadDocs();
    } finally {
      setUploading(false);
    }
  }

  async function handleDelete(id: number) {
    await apiFetch(`/knowledge-base/${id}`, { method: "DELETE" });
    setDocs((prev) => prev.filter((d) => d.id !== id));
  }

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;
    const res = await apiFetch<{
      results: Array<{
        chunk_id: number;
        document_title: string;
        category: string;
        similarity: number;
        content: string;
      }>;
    }>("/knowledge-base/search", {
      method: "POST",
      body: JSON.stringify({ query, top_k: 5 }),
    });
    setHits(res.results);
  }

  return (
    <div className="space-y-6">
      <form
        onSubmit={handleUpload}
        className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
      >
        <h2 className="text-base font-semibold text-slate-900">{t.kbUploadTitle}</h2>
        <p className="mt-1 text-xs text-slate-500">{t.kbUploadSubtitle}</p>
        <div className="mt-4 grid gap-3 md:grid-cols-4">
          <input
            type="text"
            placeholder={t.kbTitlePlaceholder}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
          />
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
          >
            {categories.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
          <input
            type="file"
            accept=".pdf,.docx,.xlsx,.txt,.md"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
            className="text-xs file:mr-2 file:rounded-lg file:border-0 file:bg-slate-100 file:px-3 file:py-1.5 file:font-semibold"
          />
          <button
            type="submit"
            disabled={!file || uploading}
            className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-blue-700 px-4 py-1.5 text-xs font-semibold text-white hover:bg-blue-800 disabled:opacity-50"
          >
            <Upload className="h-3.5 w-3.5" />
            {uploading ? t.kbIndexing : t.kbIndexBtn}
          </button>
        </div>
      </form>

      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <form onSubmit={handleSearch} className="flex flex-wrap gap-2">
          <input
            type="text"
            placeholder={t.kbSearchPlaceholder}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="flex-1 min-w-[240px] rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
          />
          <button
            type="submit"
            className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-4 py-1.5 text-xs font-semibold text-white hover:bg-slate-800"
          >
            <Search className="h-3.5 w-3.5" />
            {t.kbSearchBtn}
          </button>
        </form>

        {hits.length > 0 && (
          <div className="mt-4 space-y-2">
            {hits.map((h) => (
              <div key={h.chunk_id} className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs">
                <div className="flex justify-between font-semibold text-slate-800">
                  <span>
                    {h.document_title} ({h.category})
                  </span>
                  <span className="text-blue-700">
                    {t.kbSimilarity} {(h.similarity * 100).toFixed(1)}%
                  </span>
                </div>
                <p className="mt-1 text-slate-600">{h.content}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="text-sm font-semibold text-slate-900">
          {t.kbIndexedDocs} ({docs.length})
        </h3>
        <div className="mt-3 divide-y divide-slate-100">
          {docs.length === 0 ? (
            <p className="py-4 text-xs text-slate-500">{t.kbEmptyDocs}</p>
          ) : (
            docs.map((d) => (
              <div key={d.id} className="flex items-center justify-between py-2.5 text-xs">
                <div>
                  <span className="font-semibold text-slate-900">{d.title}</span>
                  <span className="ml-2 rounded bg-slate-100 px-2 py-0.5 text-slate-600">
                    {d.category}
                  </span>
                  <span className="ml-2 text-slate-500">
                    {d.filename} • {d.chunk_count} chunk(s)
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => handleDelete(d.id)}
                  className="inline-flex items-center gap-1 rounded px-2 py-1 text-rose-600 hover:bg-rose-50"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  {t.deleteBtn}
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
