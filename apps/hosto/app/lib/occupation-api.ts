import { apiFetch } from "@repo/network/client";
import { ApiError } from "./api";
import type { LitStatus } from "./beds-api";

export interface ServiceOccupationOverview {
  service_id: number;
  service_nom: string;
  service_code: string | null;
  total_lits: number;
  libres: number;
  occupes: number;
  nettoyage: number;
  maintenance: number;
  hors_service: number;
  taux_occupation: number;
  patients_hospitalises: number;
}

export interface LitOccupant {
  sejour_id: number;
  patient_id: number;
  patient_nom: string;
  patient_dossier: string;
  patient_age: number | null;
  patient_sexe: string | null;
  admitted_at: string | null;
  motif_admission: string | null;
  duree_jours: number;
}

export interface LitOccupation {
  lit_id: number;
  numero: string;
  status: LitStatus;
  occupant: LitOccupant | null;
  nettoyage_depuis: string | null;
  anomalie: boolean;
}

export interface ChambreOccupation {
  chambre_id: number;
  numero: string;
  nom: string | null;
  type: string | null;
  etage: string | null;
  lits: LitOccupation[];
}

export interface ServiceOccupationDetail {
  service_id: number;
  service_nom: string;
  chambres: ChambreOccupation[];
}

export interface LitLibre {
  lit_id: number;
  numero: string;
  chambre_id: number;
  chambre_numero: string;
  chambre_nom: string | null;
  chambre_type: string | null;
  service_id: number;
  service_nom: string | null;
}

export interface PatientLocalisation {
  hospitalise: boolean;
  sejour_id: number | null;
  service_id: number | null;
  service_nom: string | null;
  chambre_numero: string | null;
  lit_numero: string | null;
  admitted_at: string | null;
  duree_jours: number | null;
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

export async function getOccupationOverview(): Promise<ServiceOccupationOverview[]> {
  return parseJson<ServiceOccupationOverview[]>(await apiFetch("/api/occupation/overview"));
}

export async function getServiceOccupation(serviceId: number): Promise<ServiceOccupationDetail> {
  return parseJson<ServiceOccupationDetail>(await apiFetch(`/api/occupation/services/${serviceId}`));
}

export async function getLitsLibres(filters?: {
  service_id?: number;
  type_chambre?: string;
}): Promise<LitLibre[]> {
  const qs = new URLSearchParams();
  if (filters?.service_id != null) qs.set("service_id", String(filters.service_id));
  if (filters?.type_chambre) qs.set("type_chambre", filters.type_chambre);
  const suffix = qs.toString() ? `?${qs}` : "";
  return parseJson<LitLibre[]>(await apiFetch(`/api/occupation/lits-libres${suffix}`));
}

export async function getPatientLocalisation(patientId: number | string): Promise<PatientLocalisation> {
  return parseJson<PatientLocalisation>(await apiFetch(`/api/patients/${patientId}/localisation`));
}

export async function admettrePatient(payload: {
  patient_id: number;
  service_id: number;
  lit_id: number;
  motif?: string | null;
}): Promise<{ id: number }> {
  return parseJson<{ id: number }>(
    await apiFetch("/api/sejours/admettre", { method: "POST", body: payload }),
  );
}
