import { apiFetch } from "@repo/network/client";
import { ApiError } from "./api";

export type LitStatus = "LIBRE" | "OCCUPE" | "NETTOYAGE" | "MAINTENANCE" | "HORS_SERVICE";

// Statuts posables manuellement (OCCUPE est réservé à l'admission H2).
export const OPERATIONAL_STATUSES: LitStatus[] = [
  "LIBRE", "NETTOYAGE", "MAINTENANCE", "HORS_SERVICE",
];

export const LIT_STATUS_LABEL: Record<LitStatus, string> = {
  LIBRE: "Libre",
  OCCUPE: "Occupé",
  NETTOYAGE: "Nettoyage",
  MAINTENANCE: "Maintenance",
  HORS_SERVICE: "Hors service",
};

export type ChambreType = "INDIVIDUELLE" | "DOUBLE" | "COMMUNE" | "ISOLEMENT" | "AUTRE";

export interface Lit {
  id: number;
  chambre_id: number;
  numero: string;
  status: LitStatus;
  active: boolean;
  notes: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface ChambreListItem {
  id: number;
  service_id: number;
  service_nom: string | null;
  numero: string;
  nom: string | null;
  type: string | null;
  etage: string | null;
  active: boolean;
  nb_lits: number;
  lits_par_statut: Record<string, number>;
}

export interface ChambreDetail {
  id: number;
  service_id: number;
  numero: string;
  nom: string | null;
  type: string | null;
  etage: string | null;
  active: boolean;
  notes: string | null;
  created_at: string | null;
  updated_at: string | null;
  lits: Lit[];
}

export interface ChambrePage {
  items: ChambreListItem[];
  total: number;
  page: number;
  pages: number;
}

async function parseJson<T>(response: Response): Promise<T> {
  const data: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const err = data as Record<string, unknown> | null;
    throw new ApiError(
      err != null ? String(err.detail ?? err.message ?? "Une erreur est survenue") : "Une erreur est survenue",
      response.status,
    );
  }
  return data as T;
}

// ─── Chambres ──────────────────────────────────────────────────────────────────
export async function listChambres(serviceId?: number): Promise<ChambrePage> {
  const qs = serviceId != null ? `?service_id=${serviceId}` : "";
  return parseJson<ChambrePage>(await apiFetch(`/api/chambres${qs}`));
}

export async function getChambre(id: number): Promise<ChambreDetail> {
  return parseJson<ChambreDetail>(await apiFetch(`/api/chambres/${id}`));
}

export async function createChambre(data: {
  service_id: number;
  numero: string;
  nom?: string | null;
  type?: string | null;
  etage?: string | null;
}): Promise<ChambreDetail> {
  return parseJson<ChambreDetail>(await apiFetch("/api/chambres", { method: "POST", body: data }));
}

export async function deleteChambre(id: number): Promise<void> {
  const res = await apiFetch(`/api/chambres/${id}`, { method: "DELETE" });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new ApiError(String((data as Record<string, unknown>)?.detail ?? "Suppression impossible."), res.status);
  }
}

// ─── Lits ──────────────────────────────────────────────────────────────────────
export async function createLitsBulk(chambreId: number, numeros: string[]): Promise<Lit[]> {
  return parseJson<Lit[]>(
    await apiFetch("/api/lits/bulk", { method: "POST", body: { chambre_id: chambreId, numeros } }),
  );
}

export async function changeLitStatus(id: number, status: LitStatus): Promise<Lit> {
  return parseJson<Lit>(await apiFetch(`/api/lits/${id}/status`, { method: "POST", body: { status } }));
}

export async function deleteLit(id: number): Promise<void> {
  const res = await apiFetch(`/api/lits/${id}`, { method: "DELETE" });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new ApiError(String((data as Record<string, unknown>)?.detail ?? "Suppression impossible."), res.status);
  }
}
