import { apiFetch } from "@repo/network/client";
import { ApiError } from "./api";

export type VisiteStatus = "ARRIVE" | "EN_ATTENTE" | "EN_CONSULTATION" | "TERMINE" | "PARTI";
export type VisitePriority = "NORMAL" | "URGENT" | "TRES_URGENT" | "CRITIQUE";

export const VISITE_STATUS_LABELS: Record<VisiteStatus, string> = {
  ARRIVE:          "Arrivé",
  EN_ATTENTE:      "En attente",
  EN_CONSULTATION: "En consultation",
  TERMINE:         "Terminé",
  PARTI:           "Parti",
};

export const VISITE_PRIORITY_LABELS: Record<VisitePriority, string> = {
  NORMAL:      "Normal",
  URGENT:      "Urgent",
  TRES_URGENT: "Très urgent",
  CRITIQUE:    "Critique",
};

export interface PatientInfo {
  id: number;
  dossier_number: string;
  nom: string;
  postnom: string;
  prenom: string;
  sexe: string;
}

export interface ServiceInfo {
  id: number;
  nom: string;
  code: string;
}

export interface Visite {
  id: number;
  workspace_id: number;
  patient_id: number;
  service_id: number | null;
  encounter_id: number | null;
  status: VisiteStatus;
  priority: VisitePriority;
  reason: string | null;
  notes: string | null;
  arrived_at: string;
  taken_at: string | null;
  ended_at: string | null;
  registered_by: number | null;
  created_at: string;
  updated_at: string;
  patient: PatientInfo;
  service: ServiceInfo | null;
}

export interface VisitePage {
  items: Visite[];
  total: number;
  page: number;
  pages: number;
}

export interface VisiteCreateInput {
  patient_id: number;
  service_id?: number | null;
  priority?: VisitePriority;
  reason?: string | null;
  notes?: string | null;
}

async function parseResponse<T>(res: Response): Promise<T> {
  const data = await res.json();
  if (!res.ok) throw new ApiError(data.detail ?? "Une erreur est survenue", res.status);
  return data as T;
}

export async function listVisites(params?: {
  status?: VisiteStatus[];
  service_id?: number;
  priority?: VisitePriority;
  page?: number;
  per_page?: number;
}): Promise<VisitePage> {
  const qs = new URLSearchParams();
  params?.status?.forEach((s) => qs.append("status", s));
  if (params?.service_id) qs.set("service_id", String(params.service_id));
  if (params?.priority) qs.set("priority", params.priority);
  if (params?.page) qs.set("page", String(params.page));
  if (params?.per_page) qs.set("per_page", String(params.per_page));
  const q = qs.toString();
  return parseResponse(await apiFetch(`/api/visites${q ? `?${q}` : ""}`));
}

export async function getVisite(id: number): Promise<Visite> {
  return parseResponse(await apiFetch(`/api/visites/${id}`));
}

export async function createVisite(data: VisiteCreateInput): Promise<Visite> {
  return parseResponse(await apiFetch("/api/visites", { method: "POST", body: data }));
}

export async function orientVisite(id: number, service_id: number): Promise<Visite> {
  return parseResponse(
    await apiFetch(`/api/visites/${id}/orient`, { method: "POST", body: { service_id } }),
  );
}

export async function leaveVisite(id: number): Promise<Visite> {
  return parseResponse(await apiFetch(`/api/visites/${id}/leave`, { method: "POST", body: {} }));
}

export async function deleteVisite(id: number): Promise<void> {
  const res = await apiFetch(`/api/visites/${id}`, { method: "DELETE" });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new ApiError(data.detail ?? "Impossible de supprimer la visite", res.status);
  }
}
