import { apiFetch } from "@repo/network/client";

async function parse<T>(res: Response): Promise<T> {
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error((data && (data.detail || data.message)) || "Une erreur est survenue.");
  }
  return data as T;
}

export interface ValeurReference {
  id: number;
  sex: string;
  age_min_years: number | null;
  age_max_years: number | null;
  low: number | null;
  high: number | null;
  text_normal: string | null;
  note: string | null;
  is_loinc: boolean;
}

export interface ParametreExamen {
  id: number;
  name: string;
  unit: string | null;
  value_type: string;
  loinc_code: string | null;
  display_order: number;
  ranges_loinc: ValeurReference[];
  ranges_workspace: ValeurReference[];
}

export interface ExamenListItem {
  id: number;
  loinc_code: string | null;
  name: string;
  short_name: string | null;
  category: string | null;
  specimen: string | null;
  source: string;
  is_loinc: boolean;
  editable: boolean;
  nb_parametres: number;
}

export interface ExamenPage {
  items: ExamenListItem[];
  total: number;
  page: number;
  pages: number;
}

export interface ExamenDetail {
  id: number;
  loinc_code: string | null;
  name: string;
  short_name: string | null;
  category: string | null;
  specimen: string | null;
  source: string;
  is_loinc: boolean;
  editable: boolean;
  parametres: ParametreExamen[];
}

export async function listExamens(params?: {
  q?: string;
  category?: string;
  page?: number;
  per_page?: number;
}): Promise<ExamenPage> {
  const sp = new URLSearchParams();
  if (params?.q) sp.set("q", params.q);
  if (params?.category) sp.set("category", params.category);
  sp.set("page", String(params?.page ?? 1));
  sp.set("per_page", String(params?.per_page ?? 20));
  return parse(await apiFetch(`/api/examens?${sp.toString()}`));
}

export async function getExamen(id: number): Promise<ExamenDetail> {
  return parse(await apiFetch(`/api/examens/${id}`));
}

export async function createExamen(body: {
  name: string;
  category?: string | null;
  specimen?: string | null;
  code?: string | null;
}): Promise<ExamenDetail> {
  return parse(await apiFetch(`/api/examens`, { method: "POST", body }));
}

export async function updateExamen(
  id: number,
  body: { name?: string; category?: string | null; specimen?: string | null; active?: boolean },
): Promise<ExamenDetail> {
  return parse(await apiFetch(`/api/examens/${id}`, { method: "PUT", body }));
}

export async function deleteExamen(id: number): Promise<void> {
  const res = await apiFetch(`/api/examens/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error("Suppression impossible.");
}

export async function addParametre(
  examId: number,
  body: { name: string; unit?: string | null; value_type?: string; display_order?: number },
): Promise<ExamenDetail> {
  return parse(await apiFetch(`/api/examens/${examId}/parametres`, { method: "POST", body }));
}

export async function deleteParametre(paramId: number): Promise<ExamenDetail> {
  return parse(await apiFetch(`/api/examens/parametres/${paramId}`, { method: "DELETE" }));
}

export async function addValeur(
  paramId: number,
  body: {
    sex?: string;
    age_min_years?: number | null;
    age_max_years?: number | null;
    low?: number | null;
    high?: number | null;
    text_normal?: string | null;
    note?: string | null;
  },
): Promise<ParametreExamen> {
  return parse(await apiFetch(`/api/examens/parametres/${paramId}/valeurs`, { method: "POST", body }));
}

export async function deleteValeur(rangeId: number): Promise<void> {
  const res = await apiFetch(`/api/examens/valeurs/${rangeId}`, { method: "DELETE" });
  if (!res.ok) throw new Error("Suppression impossible.");
}

export async function syncExamensFacturation(): Promise<{ synced: number; total: number }> {
  return parse(await apiFetch(`/api/examens/sync-facturation`, { method: "POST" }));
}
