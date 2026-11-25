export interface CompanyProfile {
  id?: number;
  name: string;
  president?: string | null;
  siren?: string | null;
  siret?: string | null;
  tva_number?: string | null;
  naf_code?: string | null;
  address?: string | null;
  description: string;
  capabilities: string[];
  certifications: string[];
  target_cpv_codes: string[];
  target_departments: string[];
  target_keywords: string[];
  procedure_types: string[];
  min_days_remaining: number;
  min_target_amount?: number | null;
  max_target_amount?: number | null;
  include_all_france: boolean;
  include_eu: boolean;
  min_suitability_score: number;
}

export interface TenderNotice {
  id: number;
  boamp_id: string;
  source: string;
  region: string;
  country: string;
  title: string;
  buyer_name?: string | null;
  department?: string | null;
  cpv_codes: string[];
  procedure_type?: string | null;
  publication_date?: string | null;
  deadline_date?: string | null;
  days_remaining?: number | null;
  estimated_amount?: number | null;
  currency: string;
  boamp_url?: string | null;
  description?: string | null;
  attribution: string;
  go_no_go_score?: number | null;
  go_no_go_summary: string[];
  status: string;
}

export interface KnowledgeDocument {
  id: number;
  title: string;
  category: string;
  filename: string;
  file_type: string;
  file_size: number;
  chunk_count: number;
  created_at: string;
}

export interface ChecklistItem {
  id: string;
  item: string;
  source: string;
  mandatory: boolean;
  checked: boolean;
  human_review_required: boolean;
  notes?: string;
}

export interface MemoireCitation {
  document_title: string;
  category: string;
  similarity: number;
  excerpt: string;
}

export interface MemoireSection {
  id: string;
  title: string;
  cctp_requirement: string;
  weight_hint?: string;
  draft_markdown: string;
  citations: MemoireCitation[];
}

export interface TenderWorkspace {
  id: number;
  tender_notice_id?: number | null;
  title: string;
  buyer_name?: string | null;
  reference_code?: string | null;
  dce_files: Array<{
    filename: string;
    role: string;
    size: number;
    extracted_chars: number;
    notes?: string;
  }>;
  submission_deadline?: string | null;
  site_visit_required?: boolean | null;
  site_visit_details?: string | null;
  lots: Array<{ number: string; title: string; description: string }>;
  evaluation_criteria: Array<{ name: string; weight: string }>;
  compliance_checklist: ChecklistItem[];
  flagged_financial_legal: Array<{
    file: string;
    clause_or_sheet: string;
    risk_level: string;
    summary: string;
    action: string;
  }>;
  memoire_sections: MemoireSection[];
  last_export_path?: string | null;
  created_at: string;
  updated_at: string;
}

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "/api";

export function getStoredToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("fta_token");
}

export function setStoredToken(token: string | null): void {
  if (typeof window === "undefined") return;
  if (token) {
    localStorage.setItem("fta_token", token);
  } else {
    localStorage.removeItem("fta_token");
  }
}

export async function apiFetch<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getStoredToken();
  const headers = new Headers(options.headers || {});
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }
  if (!(options.body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  if (res.status === 401) {
    setStoredToken(null);
    throw new Error("UNAUTHORIZED");
  }
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(errText || `HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export async function apiDownloadBlob(path: string): Promise<Blob> {
  const token = getStoredToken();
  const headers = new Headers();
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }
  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers,
  });
  if (!res.ok) {
    throw new Error(`Export failed (${res.status})`);
  }
  return res.blob();
}
