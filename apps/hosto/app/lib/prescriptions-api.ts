import { apiFetch } from "@repo/network/client";
import { ApiError } from "./api";

export class SignBlockedError extends Error {
  blockingMedications: string[];
  constructor(medications: string[]) {
    super(
      `Signature refusée — justification requise pour : ${medications.join(", ")}`,
    );
    this.blockingMedications = medications;
  }
}

// Refus de signature : item en suivi d'administration sans données complètes (H4a).
export class SignAdminBlockedError extends Error {
  blockingAdministration: string[];
  constructor(items: string[]) {
    super(`Signature refusée — données de suivi incomplètes pour : ${items.join(", ")}`);
    this.blockingAdministration = items;
  }
}

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
  // Suivi d'administration (H4a)
  suivi_administration: boolean;
  mode_administration: string | null;
  dose_quantite: number | null;
  dose_unite: string | null;
  frequence_par_jour: number | null;
  duree_jours: number | null;
  schema_id: number | null;
  horaires_personnalises: string[] | null;
  date_debut: string | null;
  horaires_effectifs: string[] | null;
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
  // Suivi d'administration (H4a)
  suivi_administration?: boolean;
  mode_administration?: string | null;
  dose_quantite?: number | null;
  dose_unite?: string | null;
  frequence_par_jour?: number | null;
  duree_jours?: number | null;
  schema_id?: number | null;
  horaires_personnalises?: string[] | null;
  date_debut?: string | null;
}

export interface PrescriptionCreate {
  patient_id: number;
  encounter_id: number;
  notes?: string | null;
  items: PrescriptionItemCreate[];
}

export interface PrescriptionItemPatch {
  dosage?: string;
  frequency?: string;
  route?: string | null;
  duration?: string | null;
  instructions?: string | null;
  allergy_overridden?: boolean;
  override_reason?: string;
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
  const data: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const err = data as Record<string, unknown> | null;
    const message =
      err != null
        ? String(err.detail ?? err.message ?? "Une erreur est survenue")
        : "Une erreur est survenue";
    throw new ApiError(message, response.status);
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

export async function updatePrescriptionItem(
  prescriptionId: number | string,
  itemId: number,
  data: PrescriptionItemPatch,
): Promise<PrescriptionRead> {
  return parseJson<PrescriptionRead>(
    await apiFetch(`/api/prescriptions/${prescriptionId}/items/${itemId}`, {
      method: "PATCH",
      body: data,
    }),
  );
}

export async function deletePrescription(id: number | string): Promise<void> {
  const res = await apiFetch(`/api/prescriptions/${id}`, { method: "DELETE" });
  if (!res.ok) {
    const data: unknown = await res.json().catch(() => null);
    const err = data as Record<string, unknown> | null;
    throw new ApiError(
      String(err?.detail ?? err?.message ?? "Erreur lors de la suppression."),
      res.status,
    );
  }
}

export async function checkPrescriptionAllergies(
  id: number | string,
): Promise<AllergyCheckResult> {
  return parseJson<AllergyCheckResult>(
    await apiFetch(`/api/prescriptions/${id}/check-allergies`, { method: "POST", body: {} }),
  );
}

export async function signPrescription(id: number | string): Promise<PrescriptionRead> {
  const res = await apiFetch(`/api/prescriptions/${id}/sign`, { method: "POST", body: {} });
  if (res.status === 409) {
    const raw: unknown = await res.json().catch(() => null);
    const err = raw as Record<string, unknown> | null;
    const detail = err?.detail as Record<string, unknown> | string | null | undefined;
    const blocking = typeof detail === "object" && detail !== null && Array.isArray(detail.blocking_medications)
      ? (detail.blocking_medications as string[])
      : null;
    if (blocking) throw new SignBlockedError(blocking);
    const blockingAdmin = typeof detail === "object" && detail !== null && Array.isArray(detail.blocking_administration)
      ? (detail.blocking_administration as string[])
      : null;
    if (blockingAdmin) throw new SignAdminBlockedError(blockingAdmin);
    const msg =
      typeof detail === "string"
        ? detail
        : typeof detail === "object" && detail !== null
          ? String(detail.message ?? "Signature refusée")
          : "Signature refusée";
    throw new ApiError(msg, 409);
  }
  return parseJson<PrescriptionRead>(res);
}

export async function downloadPrescriptionPdf(id: number | string): Promise<void> {
  const res = await fetch(`/api/prescriptions/${id}/pdf`, { credentials: "include" });
  if (!res.ok) throw new Error("Impossible de générer l'ordonnance PDF.");
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  window.open(url, "_blank");
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
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
