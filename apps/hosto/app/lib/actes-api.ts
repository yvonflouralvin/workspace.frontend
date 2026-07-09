import { apiFetch } from "@repo/network/client";
import { ApiError } from "./api";

// ─── Refus de paiement (flux métier, pas une erreur technique) ─────────────────

export class PaymentRequiredError extends Error {
  constructor(message?: string) {
    super(
      message ??
        "Cet acte nécessite un paiement préalable. Le patient doit régler avant réalisation.",
    );
    this.name = "PaymentRequiredError";
  }
}

// ─── Types ─────────────────────────────────────────────────────────────────────

export type ActeType = "MEDICAL" | "INFIRMIER" | "AUTRE";

export type ActePrescritStatus =
  | "PRESCRIT"
  | "EN_ATTENTE_PAIEMENT"
  | "REALISABLE"
  | "REALISE"
  | "ANNULE";

export interface ActeCatalogItem {
  id: number;
  ichi_code: string | null;
  libelle: string;
  short_name: string | null;
  category: string | null;
  acte_type: ActeType;
  active: boolean;
  paiement_bloquant: boolean;
  has_override: boolean;
  is_custom: boolean;
  editable: boolean;
  source: string;
}

export interface ActeRealise {
  id: number;
  acte_prescrit_id: number;
  patient_id: number;
  acte_catalog_id: number;
  performed_by: number;
  performed_by_name: string | null;
  performed_by_role: string | null;
  performed_at: string | null;
  observations: string | null;
  complications: string | null;
  quantite_realisee: number;
  created_at: string | null;
}

export interface ActePatientMini {
  id: number;
  dossier_number: string;
  nom: string;
  postnom: string | null;
  prenom: string;
}

export interface ActePrescrit {
  id: number;
  workspace_id: number;
  patient_id: number;
  patient: ActePatientMini | null;
  encounter_id: number;
  acte_catalog_id: number;
  acte_libelle: string;
  acte_type: ActeType | null;
  prescribed_by: number;
  prescribed_by_name: string | null;
  prescribed_by_role: string | null;
  prescribed_at: string | null;
  quantite: number;
  indication: string | null;
  status: ActePrescritStatus;
  paiement_bloquant: boolean;
  paye: boolean;
  vente_commande_id: number | null;
  realise: ActeRealise | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface PrescrirePayload {
  acte_catalog_id: number;
  patient_id: number;
  encounter_id: number;
  quantite?: number;
  indication?: string | null;
}

export interface RealiserPayload {
  observations?: string | null;
  complications?: string | null;
  quantite_realisee?: number;
  performed_at?: string | null;
}

export interface PrescrireEtRealiserPayload extends PrescrirePayload, RealiserPayload {}

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function parseJson<T>(response: Response): Promise<T> {
  const data: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const err = data as Record<string, unknown> | null;
    const message =
      err != null
        ? String(err.detail ?? err.message ?? "Une erreur est survenue")
        : "Une erreur est survenue";
    // 402 (et 409 pour paiement) → flux métier « paiement requis ».
    if (response.status === 402) throw new PaymentRequiredError(message);
    throw new ApiError(message, response.status);
  }
  return data as T;
}

// ─── Catalogue ─────────────────────────────────────────────────────────────────

export async function searchActes(q: string, type?: ActeType): Promise<ActeCatalogItem[]> {
  const params = new URLSearchParams();
  if (q.trim()) params.set("q", q.trim());
  if (type) params.set("type", type);
  return parseJson<ActeCatalogItem[]>(
    await apiFetch(`/api/acte-catalog/search?${params.toString()}`),
  );
}

// ─── Prescription / réalisation ────────────────────────────────────────────────

export async function prescrireActe(payload: PrescrirePayload): Promise<ActePrescrit> {
  return parseJson<ActePrescrit>(
    await apiFetch("/api/actes/prescrire", { method: "POST", body: payload }),
  );
}

export async function prescrireEtRealiser(
  payload: PrescrireEtRealiserPayload,
): Promise<ActePrescrit> {
  return parseJson<ActePrescrit>(
    await apiFetch("/api/actes/prescrire-et-realiser", { method: "POST", body: payload }),
  );
}

export async function realiserActe(
  id: number | string,
  payload: RealiserPayload,
): Promise<ActePrescrit> {
  return parseJson<ActePrescrit>(
    await apiFetch(`/api/actes/${id}/realiser`, { method: "POST", body: payload }),
  );
}

export async function annulerActe(id: number | string, motif: string): Promise<ActePrescrit> {
  return parseJson<ActePrescrit>(
    await apiFetch(`/api/actes/${id}/annuler`, { method: "POST", body: { motif } }),
  );
}

// ─── Lecture ─────────────────────────────────────────────────────────────────

export async function getActe(id: number | string): Promise<ActePrescrit> {
  return parseJson<ActePrescrit>(await apiFetch(`/api/actes/${id}`));
}

export async function getPatientActes(patientId: number | string): Promise<ActePrescrit[]> {
  return parseJson<ActePrescrit[]>(await apiFetch(`/api/patients/${patientId}/actes`));
}

export async function getEncounterActes(
  encounterId: number | string,
): Promise<ActePrescrit[]> {
  return parseJson<ActePrescrit[]>(await apiFetch(`/api/encounters/${encounterId}/actes`));
}

export async function getActesFile(status?: ActePrescritStatus): Promise<ActePrescrit[]> {
  const qs = status ? `?status=${status}` : "";
  return parseJson<ActePrescrit[]>(await apiFetch(`/api/actes${qs}`));
}

// ─── Gestion du catalogue (Paramètres) ────────────────────────────────────────

export interface ActeCatalogPage {
  items: ActeCatalogItem[];
  total: number;
  page: number;
  pages: number;
}

export interface ActeOverrideInput {
  libelle_local?: string | null;
  active?: boolean | null;
  paiement_bloquant?: boolean;
}

export async function listActeCatalog(params?: {
  category?: string;
  type?: ActeType;
  include_inactive?: boolean;
  page?: number;
  per_page?: number;
}): Promise<ActeCatalogPage> {
  const qs = new URLSearchParams();
  if (params?.category) qs.set("category", params.category);
  if (params?.type) qs.set("type", params.type);
  if (params?.include_inactive) qs.set("include_inactive", "true");
  if (params?.page) qs.set("page", String(params.page));
  if (params?.per_page) qs.set("per_page", String(params.per_page));
  return parseJson<ActeCatalogPage>(
    await apiFetch(`/api/acte-catalog${qs.toString() ? `?${qs}` : ""}`),
  );
}

export interface ActeResolvedDetail {
  id: number;
  ichi_code: string | null;
  name: string;
  short_name: string | null;
  category: string | null;
  acte_type: ActeType;
  description: string | null;
  libelle: string;
  active: boolean;
  paiement_bloquant: boolean;
  has_override: boolean;
  is_custom: boolean;
  editable: boolean;
  source: string;
}

export interface ActeCustomCreate {
  name: string;
  acte_type: ActeType;
  category?: string | null;
  short_name?: string | null;
  ichi_code?: string | null;
  description?: string | null;
  paiement_bloquant?: boolean;
}

export interface ActeCustomUpdate {
  name?: string;
  acte_type?: ActeType;
  category?: string | null;
  short_name?: string | null;
  paiement_bloquant?: boolean;
  active?: boolean;
}

export async function getActeCatalogDetail(id: number): Promise<ActeResolvedDetail> {
  return parseJson<ActeResolvedDetail>(await apiFetch(`/api/acte-catalog/${id}`));
}

export async function createActe(data: ActeCustomCreate): Promise<ActeResolvedDetail> {
  return parseJson<ActeResolvedDetail>(
    await apiFetch("/api/acte-catalog", { method: "POST", body: data }),
  );
}

export async function updateActe(
  id: number,
  data: ActeCustomUpdate,
): Promise<ActeResolvedDetail> {
  return parseJson<ActeResolvedDetail>(
    await apiFetch(`/api/acte-catalog/${id}`, { method: "PUT", body: data }),
  );
}

export async function deleteActe(id: number): Promise<void> {
  const res = await apiFetch(`/api/acte-catalog/${id}`, { method: "DELETE" });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new ApiError(
      String((data as Record<string, unknown>)?.detail ?? "Échec de la suppression."),
      res.status,
    );
  }
}

export async function upsertActeOverride(
  id: number,
  data: ActeOverrideInput,
): Promise<ActeCatalogItem> {
  // Le backend renvoie l'acte résolu ; on le remappe en item de liste côté appelant.
  return parseJson<ActeCatalogItem>(
    await apiFetch(`/api/acte-catalog/${id}/override`, { method: "PUT", body: data }),
  );
}

export async function deleteActeOverride(id: number): Promise<void> {
  const res = await apiFetch(`/api/acte-catalog/${id}/override`, { method: "DELETE" });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new ApiError(
      String((data as Record<string, unknown>)?.detail ?? "Échec de la réinitialisation."),
      res.status,
    );
  }
}

export async function syncActeProduits(): Promise<{ synced: number; total: number }> {
  return parseJson<{ synced: number; total: number }>(
    await apiFetch("/api/acte-catalog/sync-produits", { method: "POST", body: {} }),
  );
}
