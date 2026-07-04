import { apiFetch } from "@repo/network/client";
import { ApiError } from "./api";

// ─── Types ────────────────────────────────────────────────────────────────────

export type PrescriptionStatus = "BROUILLON" | "SIGNEE" | "ANNULEE";

export interface PrescriptionItemRead {
  id: number;
  medication_id: number;
  medication_name_cache: string;
  dosage: string;
  frequency: string;
  route: string | null;
  duration: string | null;
  instructions: string | null;
  allergy_alert_raised: boolean;
  allergy_overridden: boolean;
}

export interface PrescriptionRead {
  id: number;
  workspace_id: number;
  patient_id: number;
  encounter_id: number;
  prescriber_id: number | null;
  status: PrescriptionStatus;
  notes: string | null;
  signed: boolean;
  signed_at: string | null;
  signed_by: number | null;
  prescribed_at: string | null;
  cancel_reason: string | null;
  created_at: string;
  updated_at: string;
  items: PrescriptionItemRead[];
}

export interface PrescriptionItemCreate {
  medication_id: number;
  dosage: string;
  frequency: string;
  route?: string | null;
  duration?: string | null;
  instructions?: string | null;
}

export interface PrescriptionCreate {
  patient_id: number;
  encounter_id: number;
  notes?: string | null;
  items: PrescriptionItemCreate[];
}

export interface PrescriptionItemUpdate {
  id: number;
  dosage?: string;
  frequency?: string;
  route?: string | null;
  duration?: string | null;
  instructions?: string | null;
}

export interface PrescriptionUpdate {
  notes?: string | null;
  items?: PrescriptionItemUpdate[];
}

export interface DrugSearchResult {
  id: number;
  name: string;
  atc_code: string;
  atc_label: string;
  form: string | null;
  strength: string | null;
  active: boolean;
}

export interface AllergyConflict {
  allergy_id: number;
  allergy_substance: string;
  allergy_severity: string;
  match_type: "ATC_EXACT" | "ATC_CROSS" | "NAME_FUZZY";
  confidence: "HIGH" | "LOW";
  matched_atc: string | null;
  message: string;
}

export interface MedicationConflict {
  medication_id: number;
  medication_name: string;
  conflicts: AllergyConflict[];
  has_conflict: boolean;
  highest_severity: string | null;
}

export interface AllergyCheckResult {
  medications: MedicationConflict[];
  has_any_conflict: boolean;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function parseJson<T>(response: Response): Promise<T> {
  const data = await response.json();
  if (!response.ok) {
    throw new ApiError(data.detail ?? data.message ?? "Une erreur est survenue", response.status);
  }
  return data as T;
}

// ─── API ─────────────────────────────────────────────────────────────────────

export async function getPatientPrescriptions(
  patientId: number | string,
): Promise<PrescriptionRead[]> {
  return parseJson<PrescriptionRead[]>(
    await apiFetch(`/api/patients/${patientId}/prescriptions`),
  );
}

export async function getPrescription(id: number | string): Promise<PrescriptionRead> {
  return parseJson<PrescriptionRead>(await apiFetch(`/api/prescriptions/${id}`));
}

export async function createPrescription(data: PrescriptionCreate): Promise<PrescriptionRead> {
  return parseJson<PrescriptionRead>(
    await apiFetch("/api/prescriptions", { method: "POST", body: data }),
  );
}

export async function updatePrescription(
  id: number | string,
  data: PrescriptionUpdate,
): Promise<PrescriptionRead> {
  return parseJson<PrescriptionRead>(
    await apiFetch(`/api/prescriptions/${id}`, { method: "PATCH", body: data }),
  );
}

export async function deletePrescription(id: number | string): Promise<void> {
  const res = await apiFetch(`/api/prescriptions/${id}`, { method: "DELETE" });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new ApiError(data.detail ?? "Erreur lors de la suppression.", res.status);
  }
}

export async function checkPrescriptionAllergies(
  id: number | string,
): Promise<AllergyCheckResult> {
  return parseJson<AllergyCheckResult>(
    await apiFetch(`/api/prescriptions/${id}/check-allergies`, { method: "POST", body: {} }),
  );
}

export async function signPrescription(
  id: number | string,
  pin?: string,
): Promise<PrescriptionRead> {
  return parseJson<PrescriptionRead>(
    await apiFetch(`/api/prescriptions/${id}/sign`, {
      method: "POST",
      body: pin ? { pin } : {},
    }),
  );
}

export async function cancelPrescription(
  id: number | string,
  reason: string,
): Promise<PrescriptionRead> {
  return parseJson<PrescriptionRead>(
    await apiFetch(`/api/prescriptions/${id}/cancel`, {
      method: "POST",
      body: { reason },
    }),
  );
}

export async function searchDrugs(q: string): Promise<DrugSearchResult[]> {
  return parseJson<DrugSearchResult[]>(
    await apiFetch(`/api/drug-catalog/search?q=${encodeURIComponent(q)}`),
  );
}

export async function checkAllergiesInstant(
  patientId: number | string,
  medicationIds: number[],
): Promise<AllergyCheckResult> {
  return parseJson<AllergyCheckResult>(
    await apiFetch("/api/allergy-check", {
      method: "POST",
      body: { patient_id: Number(patientId), medication_ids: medicationIds },
    }),
  );
}
