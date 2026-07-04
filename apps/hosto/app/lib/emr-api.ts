import { apiFetch } from "@repo/network/client";
import { ApiError } from "./api";

// ─── Types miroir des schémas backend ────────────────────────────────────────

export type AllergyType = "ALLERGIE" | "INTOLERANCE";
export type AllergyCategory = "MEDICAMENT" | "ALIMENT" | "ENVIRONNEMENT" | "AUTRE";
export type AllergySeverity = "LEGERE" | "MODEREE" | "SEVERE" | "CRITIQUE";
export type AllergyStatus = "ACTIVE" | "INACTIVE" | "RESOLUE";

export type ConditionStatus = "ACTIF" | "RESOLU" | "INACTIF";

export type MedicationStatus = "EN_COURS" | "ARRETE";

export type EncounterType = "CONSULTATION" | "URGENCE" | "HOSPITALISATION" | "SUIVI";
export type EncounterStatus = "PLANIFIE" | "EN_COURS" | "CLOS";

export type ObservationCode =
  | "TEMPERATURE"
  | "TA_SYSTOLIQUE"
  | "TA_DIASTOLIQUE"
  | "FC"
  | "FR"
  | "SPO2"
  | "POIDS"
  | "TAILLE"
  | "IMC"
  | "DOULEUR_EVA";

export type TimelineItemType =
  | "ENCOUNTER"
  | "NOTE"
  | "OBSERVATIONS"
  | "CONDITION"
  | "ALLERGY"
  | "MEDICATION";

export interface AllergyRead {
  id: number;
  workspace_id: number;
  patient_id: number;
  encounter_id: number | null;
  substance: string;
  substance_code: string | null;
  type: AllergyType;
  category: AllergyCategory;
  severity: AllergySeverity;
  reaction: string | null;
  clinical_status: AllergyStatus;
  noted_at: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface ConditionRead {
  id: number;
  workspace_id: number;
  patient_id: number;
  encounter_id: number | null;
  icd10_code: string | null;
  label: string;
  clinical_status: ConditionStatus;
  onset_date: string | null;
  resolved_date: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface MedicalHistoryRead {
  id: number;
  workspace_id: number;
  patient_id: number;
  encounter_id: number | null;
  category: string;
  title: string;
  description: string | null;
  date_approximative: string | null;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ObservationRead {
  id: number;
  workspace_id: number;
  patient_id: number;
  encounter_id: number | null;
  measured_by: number | null;
  code: ObservationCode;
  value: number;
  unit: string;
  measured_at: string;
  created_at: string;
  deleted_at: string | null;
}

export interface MedicationStatementRead {
  id: number;
  workspace_id: number;
  patient_id: number;
  encounter_id: number | null;
  medication: string;
  dosage: string | null;
  frequency: string | null;
  route: string | null;
  clinical_status: MedicationStatus;
  started_at: string | null;
  stopped_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface ClinicalNoteRead {
  id: number;
  workspace_id: number;
  patient_id: number;
  patient: { id: number; dossier_number: string; nom: string; postnom: string; prenom: string };
  encounter_id: number;
  encounter: { id: number; type: string; status: string };
  amends_note_id: number | null;
  author_id: number | null;
  subjective: string | null;
  objective: string | null;
  assessment: string | null;
  plan: string | null;
  signed: boolean;
  signed_at: string | null;
  signed_by: number | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface ClinicalNoteCreate {
  patient_id: number;
  encounter_id: number;
  subjective?: string | null;
  objective?: string | null;
  assessment?: string | null;
  plan?: string | null;
}

export interface ClinicalNoteUpdate {
  subjective?: string | null;
  objective?: string | null;
  assessment?: string | null;
  plan?: string | null;
}

export type ClinicalNoteAmendBody = ClinicalNoteUpdate;

export interface EncounterRead {
  id: number;
  workspace_id: number;
  patient_id: number;
  patient?: { id: number; nom: string; postnom: string; prenom: string };
  service_id: number | null;
  staff_id: number | null;
  appointment_id: number | null;
  type: EncounterType;
  status: EncounterStatus;
  started_at: string | null;
  ended_at: string | null;
  motif: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface LastEncounterRead {
  id: number;
  type: EncounterType;
  status: EncounterStatus;
  started_at: string | null;
  motif: string | null;
  created_at: string;
}

export interface EMRSummary {
  patient_id: number;
  active_allergies: AllergyRead[];
  active_conditions: ConditionRead[];
  current_medications: MedicationStatementRead[];
  latest_observations: ObservationRead[];
  last_encounter: LastEncounterRead | null;
}

export interface TimelineItemRead {
  date: string;
  type: TimelineItemType;
  title: string;
  summary: string | null;
  entity_type: string;
  entity_id: number;
  encounter_id: number | null;
}

export interface TimelinePage {
  items: TimelineItemRead[];
  total: number;
  page: number;
  pages: number;
}

export interface AllergyPage {
  items: AllergyRead[];
  total: number;
  page: number;
  pages: number;
}

export interface ConditionPage {
  items: ConditionRead[];
  total: number;
  page: number;
  pages: number;
}

export interface MedicalHistoryPage {
  items: MedicalHistoryRead[];
  total: number;
  page: number;
  pages: number;
}

export interface MedicationPage {
  items: MedicationStatementRead[];
  total: number;
  page: number;
  pages: number;
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

// ─── ICD-10 ──────────────────────────────────────────────────────────────────

export interface ICD10Result {
  code: string;
  label_fr: string;
}

export async function searchICD10(q: string): Promise<ICD10Result[]> {
  if (!q.trim()) return [];
  const url = `/api/icd10/search?q=${encodeURIComponent(q)}`;
  return parseJson<ICD10Result[]>(await apiFetch(url));
}

// ─── Summary ─────────────────────────────────────────────────────────────────

export async function getPatientSummary(patientId: number): Promise<EMRSummary> {
  return parseJson<EMRSummary>(await apiFetch(`/api/patients/${patientId}/summary`));
}

// ─── Timeline (stub — 5.5) ───────────────────────────────────────────────────

export async function getPatientTimeline(
  patientId: number,
  params?: { page?: number; per_page?: number; type?: string[]; from?: string; to?: string },
): Promise<TimelinePage> {
  const q = new URLSearchParams();
  if (params?.page) q.set("page", String(params.page));
  if (params?.per_page) q.set("per_page", String(params.per_page));
  if (params?.type) params.type.forEach((t) => q.append("type", t));
  if (params?.from) q.set("from", params.from);
  if (params?.to) q.set("to", params.to);
  return parseJson<TimelinePage>(
    await apiFetch(`/api/patients/${patientId}/timeline${q.size ? `?${q}` : ""}`),
  );
}

// ─── Allergies ───────────────────────────────────────────────────────────────

export interface AllergyCreate {
  patient_id: number;
  encounter_id?: null;
  substance: string;
  substance_code?: string | null;
  type: AllergyType;
  category: AllergyCategory;
  severity: AllergySeverity;
  reaction?: string | null;
  clinical_status: AllergyStatus;
}

export interface ATCClassResult {
  code: string;
  label_fr: string;
  level: number;
  parent_code: string | null;
}

export async function getPatientAllergies(patientId: number): Promise<AllergyRead[]> {
  const q = new URLSearchParams({ per_page: "200" });
  const page = await parseJson<AllergyPage>(
    await apiFetch(`/api/patients/${patientId}/allergies?${q}`),
  );
  return page.items;
}

export async function createAllergy(data: AllergyCreate): Promise<AllergyRead> {
  return parseJson<AllergyRead>(await apiFetch("/api/allergies", { method: "POST", body: data }));
}

export async function updateAllergy(id: number, data: Partial<Omit<AllergyCreate, "patient_id">>): Promise<AllergyRead> {
  return parseJson<AllergyRead>(
    await apiFetch(`/api/allergies/${id}`, { method: "PATCH", body: data }),
  );
}

export async function searchATCClasses(q: string): Promise<ATCClassResult[]> {
  return parseJson<ATCClassResult[]>(
    await apiFetch(`/api/atc/search?q=${encodeURIComponent(q)}`),
  );
}

export async function removeAllergy(id: number): Promise<void> {
  const res = await apiFetch(`/api/allergies/${id}`, { method: "DELETE" });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new ApiError(data.detail ?? "Erreur lors de la suppression.", res.status);
  }
}

// ─── Conditions ──────────────────────────────────────────────────────────────

export interface ConditionCreate {
  patient_id: number;
  encounter_id?: number | null;
  label: string;
  icd10_code?: string | null;
  clinical_status: ConditionStatus;
  onset_date?: string | null;
  resolved_date?: string | null;
  notes?: string | null;
}

export async function getPatientConditions(patientId: number): Promise<ConditionRead[]> {
  const q = new URLSearchParams({ per_page: "200" });
  const page = await parseJson<ConditionPage>(
    await apiFetch(`/api/patients/${patientId}/conditions?${q}`),
  );
  return page.items;
}

export async function createCondition(data: ConditionCreate): Promise<ConditionRead> {
  return parseJson<ConditionRead>(await apiFetch("/api/conditions", { method: "POST", body: data }));
}

export async function updateCondition(id: number, data: Partial<Omit<ConditionCreate, "patient_id">>): Promise<ConditionRead> {
  return parseJson<ConditionRead>(
    await apiFetch(`/api/conditions/${id}`, { method: "PATCH", body: data }),
  );
}

export async function removeCondition(id: number): Promise<void> {
  const res = await apiFetch(`/api/conditions/${id}`, { method: "DELETE" });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new ApiError(data.detail ?? "Erreur lors de la suppression.", res.status);
  }
}

// ─── Medical history ─────────────────────────────────────────────────────────

export type HistoryCategory = "MEDICAL" | "CHIRURGICAL" | "FAMILIAL" | "GYNECO_OBSTETRIQUE";

export interface HistoryCreate {
  patient_id: number;
  encounter_id?: null;
  category: HistoryCategory;
  title: string;
  description?: string | null;
  date_approximative?: string | null;
  active?: boolean;
}

export async function getPatientHistory(patientId: number): Promise<MedicalHistoryRead[]> {
  const q = new URLSearchParams({ per_page: "200" });
  const page = await parseJson<MedicalHistoryPage>(
    await apiFetch(`/api/patients/${patientId}/history?${q}`),
  );
  return page.items;
}

export async function createHistory(data: HistoryCreate): Promise<MedicalHistoryRead> {
  return parseJson<MedicalHistoryRead>(await apiFetch("/api/history", { method: "POST", body: data }));
}

export async function updateHistory(id: number, data: Partial<Omit<HistoryCreate, "patient_id">>): Promise<MedicalHistoryRead> {
  return parseJson<MedicalHistoryRead>(
    await apiFetch(`/api/history/${id}`, { method: "PATCH", body: data }),
  );
}

export async function removeHistory(id: number): Promise<void> {
  const res = await apiFetch(`/api/history/${id}`, { method: "DELETE" });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new ApiError(data.detail ?? "Erreur lors de la suppression.", res.status);
  }
}

// ─── Medications ─────────────────────────────────────────────────────────────

export interface MedicationCreate {
  patient_id: number;
  encounter_id?: null;
  medication: string;
  dosage?: string | null;
  frequency?: string | null;
  route?: string | null;
  clinical_status: MedicationStatus;
  started_at?: string | null;
  stopped_at?: string | null;
  notes?: string | null;
}

export async function getPatientMedications(patientId: number): Promise<MedicationStatementRead[]> {
  const q = new URLSearchParams({ per_page: "200" });
  const page = await parseJson<MedicationPage>(
    await apiFetch(`/api/patients/${patientId}/medications?${q}`),
  );
  return page.items;
}

export async function createMedication(data: MedicationCreate): Promise<MedicationStatementRead> {
  return parseJson<MedicationStatementRead>(await apiFetch("/api/medications", { method: "POST", body: data }));
}

export async function updateMedication(id: number, data: Partial<Omit<MedicationCreate, "patient_id">>): Promise<MedicationStatementRead> {
  return parseJson<MedicationStatementRead>(
    await apiFetch(`/api/medications/${id}`, { method: "PATCH", body: data }),
  );
}

export async function removeMedication(id: number): Promise<void> {
  const res = await apiFetch(`/api/medications/${id}`, { method: "DELETE" });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new ApiError(data.detail ?? "Erreur lors de la suppression.", res.status);
  }
}

// ─── Observations ────────────────────────────────────────────────────────────

export interface ObservationBatchItem {
  patient_id: number;
  encounter_id?: number | null;
  code: ObservationCode;
  value: number;
  unit: string;
  measured_at: string;
}

export async function getPatientObservations(
  patientId: number,
  params?: { code?: string; from?: string; to?: string },
): Promise<ObservationRead[]> {
  const q = new URLSearchParams();
  if (params?.code) q.set("code", params.code);
  if (params?.from) q.set("from", params.from);
  if (params?.to) q.set("to", params.to);
  return parseJson<ObservationRead[]>(
    await apiFetch(`/api/patients/${patientId}/observations${q.size ? `?${q}` : ""}`),
  );
}

export async function getLatestObservations(patientId: number): Promise<ObservationRead[]> {
  return parseJson<ObservationRead[]>(
    await apiFetch(`/api/patients/${patientId}/observations/latest`),
  );
}

export async function createObservationsBatch(
  observations: ObservationBatchItem[],
): Promise<ObservationRead[]> {
  return parseJson<ObservationRead[]>(
    await apiFetch("/api/observations/batch", { method: "POST", body: { observations } }),
  );
}

export async function computeAndStoreIMC(body: {
  patient_id: number;
  measured_at: string;
  encounter_id?: number | null;
}): Promise<ObservationRead> {
  return parseJson<ObservationRead>(
    await apiFetch("/api/observations/imc", { method: "POST", body }),
  );
}

export async function deleteObservation(id: number): Promise<void> {
  const res = await apiFetch(`/api/observations/${id}`, { method: "DELETE" });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new ApiError(data.detail ?? "Erreur lors de la suppression.", res.status);
  }
}

// ─── Clinical notes ───────────────────────────────────────────────────────────

export async function getPatientNotes(patientId: number): Promise<ClinicalNoteRead[]> {
  return parseJson<ClinicalNoteRead[]>(await apiFetch(`/api/patients/${patientId}/notes`));
}

export async function getEncounterNotes(encounterId: number): Promise<ClinicalNoteRead[]> {
  return parseJson<ClinicalNoteRead[]>(await apiFetch(`/api/encounters/${encounterId}/notes`));
}

export async function createNote(payload: ClinicalNoteCreate): Promise<ClinicalNoteRead> {
  return parseJson<ClinicalNoteRead>(
    await apiFetch("/api/notes", { method: "POST", body: payload }),
  );
}

export async function updateNote(id: number, payload: ClinicalNoteUpdate): Promise<ClinicalNoteRead> {
  return parseJson<ClinicalNoteRead>(
    await apiFetch(`/api/notes/${id}`, { method: "PATCH", body: payload }),
  );
}

export async function signNote(id: number): Promise<ClinicalNoteRead> {
  return parseJson<ClinicalNoteRead>(
    await apiFetch(`/api/notes/${id}/sign`, { method: "POST" }),
  );
}

export async function amendNote(id: number, payload: ClinicalNoteAmendBody): Promise<ClinicalNoteRead> {
  return parseJson<ClinicalNoteRead>(
    await apiFetch(`/api/notes/${id}/amend`, { method: "POST", body: payload }),
  );
}

export async function deleteNote(id: number): Promise<void> {
  const res = await apiFetch(`/api/notes/${id}`, { method: "DELETE" });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new ApiError(data.detail ?? "Erreur lors de la suppression.", res.status);
  }
}

// ─── Encounters ───────────────────────────────────────────────────────────────

export async function getPatientEncounters(
  patientId: number,
  params?: { page?: number; per_page?: number },
): Promise<{ items: EncounterRead[]; total: number; page: number; pages: number }> {
  const q = new URLSearchParams();
  if (params?.page) q.set("page", String(params.page));
  if (params?.per_page) q.set("per_page", String(params.per_page));
  return parseJson(
    await apiFetch(`/api/patients/${patientId}/encounters${q.size ? `?${q}` : ""}`),
  );
}

export async function createEncounter(payload: {
  patient_id: number;
  type?: string;
  status?: string;
  motif?: string | null;
}): Promise<EncounterRead> {
  return parseJson<EncounterRead>(
    await apiFetch("/api/encounters", { method: "POST", body: payload }),
  );
}

export async function getEncounterById(encounterId: number): Promise<EncounterRead> {
  return parseJson<EncounterRead>(await apiFetch(`/api/encounters/${encounterId}`));
}
