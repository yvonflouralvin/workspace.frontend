import { apiFetch } from "@repo/network/client";
import { ApiError } from "./api";

export type SejourStatus = "EN_COURS" | "SORTI" | "ANNULE";
export type DischargeType =
  | "DOMICILE" | "TRANSFERT_EXTERNE" | "DECES" | "CONTRE_AVIS_MEDICAL" | "AUTRE";

export interface Sejour {
  id: number;
  workspace_id: number;
  patient_id: number;
  service_id: number;
  service_nom: string | null;
  admitted_by: number;
  admitted_at: string | null;
  motif_admission: string | null;
  status: SejourStatus;
  discharged_at: string | null;
  discharge_type: string | null;
  discharge_notes: string | null;
  origin_encounter_id: number | null;
  lit_id: number | null;
  lit_numero: string | null;
  chambre_id: number | null;
  chambre_numero: string | null;
  created_at: string | null;
  updated_at: string | null;
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

export async function getPatientSejours(patientId: number | string): Promise<Sejour[]> {
  return parseJson<Sejour[]>(await apiFetch(`/api/patients/${patientId}/sejours`));
}

export async function sortirSejour(
  sejourId: number, discharge_type: DischargeType, notes?: string,
): Promise<Sejour> {
  return parseJson<Sejour>(
    await apiFetch(`/api/sejours/${sejourId}/sortir`, { method: "POST", body: { discharge_type, notes } }),
  );
}

export async function transfererSejour(
  sejourId: number, nouveau_lit_id: number, motif?: string,
): Promise<Sejour> {
  return parseJson<Sejour>(
    await apiFetch(`/api/sejours/${sejourId}/transferer`, { method: "POST", body: { nouveau_lit_id, motif } }),
  );
}

export async function annulerSejour(sejourId: number, motif: string): Promise<Sejour> {
  return parseJson<Sejour>(
    await apiFetch(`/api/sejours/${sejourId}/annuler`, { method: "POST", body: { motif } }),
  );
}

export async function admettreDepuisEncounter(
  encounterId: number, lit_id: number, motif?: string,
): Promise<Sejour> {
  return parseJson<Sejour>(
    await apiFetch(`/api/sejours/admettre-depuis-encounter/${encounterId}`, { method: "POST", body: { lit_id, motif } }),
  );
}
