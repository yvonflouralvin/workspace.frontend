import { apiFetch } from "@repo/network/client";
import { ApiError } from "./api";

// ─── Enums ────────────────────────────────────────────────────────────────────

export type LabRequestStatus = "DEMANDE" | "PARTIELLEMENT_PRELEVE" | "PRELEVE" | "EN_ANALYSE" | "VALIDE" | "ANNULE";
export type LabPriority = "ROUTINE" | "URGENT";
export type LabItemStatus = "EN_ATTENTE" | "PRELEVE" | "RESULTAT_SAISI" | "VALIDE";
export type LabPaiementStatus = "EN_ATTENTE_PAIEMENT" | "PARTIEL" | "PAYE";
export type LabResultStatus = "SAISI" | "VALIDE" | "REVISE";
export type ResultFlag = "NORMAL" | "BAS" | "HAUT" | "CRITIQUE" | "INDETERMINE";
export type LabValueType = "NUMERIC" | "TEXT" | "QUALITATIVE";

// ─── Catalogue L1 ─────────────────────────────────────────────────────────────

export interface LabReferenceRange {
  id: number;
  sex: string;
  age_min_years: number | null;
  age_max_years: number | null;
  low: number | null;
  high: number | null;
  text_normal: string | null;
  note: string | null;
}

export interface LabParameter {
  id: number;
  lab_test_id: number;
  loinc_code: string | null;
  name: string;
  unit: string | null;
  value_type: LabValueType;
  display_order: number;
  active: boolean;
  reference_ranges: LabReferenceRange[];
}

export interface LabTestDetail {
  id: number;
  loinc_code: string | null;
  name: string;
  short_name: string | null;
  category: string | null;
  specimen: string | null;
  active: boolean;
  parameters: LabParameter[];
}

// ─── Demandes ─────────────────────────────────────────────────────────────────

export interface LabRequestItem {
  id: number;
  lab_request_id: number;
  lab_test_id: number;
  lab_test_name_cache: string;
  status: LabItemStatus;
  paiement_status: LabPaiementStatus | null;
  collected_at: string | null;
  collected_by: number | null;
  validated_at: string | null;
  validated_by: number | null;
  notes: string | null;
}

export interface PatientInfoMin {
  id: number;
  prenom: string;
  nom: string;
  dossier_number: string;
}

export interface LabRequest {
  id: number;
  workspace_id: string;
  patient_id: number;
  encounter_id: number;
  requested_by: number | null;
  status: LabRequestStatus;
  priority: LabPriority;
  clinical_info: string | null;
  requested_at: string;
  collected_at: string | null;
  collected_by: number | null;
  validated_at: string | null;
  snapshot_taken_at: string | null;
  patient_age_years_at_collection: number | null;
  patient_sex_at_collection: string | null;
  patient_weight_at_collection: number | null;
  patient_height_at_collection: number | null;
  patient_systolic_at_collection: number | null;
  patient_diastolic_at_collection: number | null;
  patient_temperature_at_collection: number | null;
  context_snapshot: Record<string, unknown> | null;
  items: LabRequestItem[];
  patient: PatientInfoMin | null;
}

export interface LabRequestListResponse {
  items: LabRequest[];
  total: number;
  page: number;
  pages: number;
}

// ─── Résultats ────────────────────────────────────────────────────────────────

export interface LabResultValue {
  id: number;
  lab_parameter_id: number;
  parameter_name_cache: string;
  unit_cache: string | null;
  value_numeric: number | null;
  value_text: string | null;
  interpretation: ResultFlag;
  reference_used: string | null;
  abnormal: boolean;
}

export interface ContextSnapshot {
  snapshot_taken_at: string | null;
  patient_age_years_at_collection: number | null;
  patient_sex_at_collection: string | null;
  patient_weight_at_collection: number | null;
  patient_height_at_collection: number | null;
  patient_systolic_at_collection: number | null;
  patient_diastolic_at_collection: number | null;
  patient_temperature_at_collection: number | null;
  context_snapshot: Record<string, unknown> | null;
}

export interface LabResult {
  id: number;
  workspace_id: string;
  lab_request_item_id: number;
  patient_id: number;
  lab_test_id: number;
  status: LabResultStatus;
  entered_by: number | null;
  entered_at: string;
  validated_by: number | null;
  validated_at: string | null;
  conclusion: string | null;
  context: ContextSnapshot;
  values: LabResultValue[];
  created_at: string;
}

// ─── Inputs ───────────────────────────────────────────────────────────────────

export interface CollectContextValues {
  weight_kg?: number;
  height_cm?: number;
  systolic_mmhg?: number;
  diastolic_mmhg?: number;
  temperature_c?: number;
}

export interface ResultValueInput {
  lab_parameter_id: number;
  value_numeric?: number;
  value_text?: string;
}

// ─── Catalogue summary ────────────────────────────────────────────────────────

export interface LabTestSummary {
  id: number;
  loinc_code: string | null;
  name: string;
  short_name: string | null;
  category: string | null;
  specimen: string | null;
  active: boolean;
  parameter_count: number;
}

// ─── Création demande ────────────────────────────────────────────────────────

export interface CreateLabRequestInput {
  patient_id: number;
  encounter_id: number;
  priority?: LabPriority;
  clinical_info?: string;
  items: { lab_test_id: number; notes?: string }[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function parseResponse<T>(res: Response): Promise<T> {
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new ApiError((data && data.detail) || "Une erreur est survenue", res.status);
  return data as T;
}

// ─── API functions ────────────────────────────────────────────────────────────

export async function getLabQueue(filters?: {
  status?: LabRequestStatus[];
  priority?: LabPriority;
  page?: number;
  per_page?: number;
}): Promise<LabRequestListResponse> {
  const qs = new URLSearchParams();
  filters?.status?.forEach((s) => qs.append("status", s));
  if (filters?.priority) qs.set("priority", filters.priority);
  if (filters?.page) qs.set("page", String(filters.page));
  if (filters?.per_page) qs.set("per_page", String(filters.per_page));
  const q = qs.toString();
  return parseResponse(await apiFetch(`/api/lab-requests${q ? `?${q}` : ""}`));
}

export async function getLabRequest(id: number): Promise<LabRequest> {
  return parseResponse(await apiFetch(`/api/lab-requests/${id}`));
}

export async function collectSample(id: number, context?: CollectContextValues): Promise<LabRequest> {
  return parseResponse(
    await apiFetch(`/api/lab-requests/${id}/collect`, { method: "POST", body: context ?? {} }),
  );
}

export async function collectLabItem(itemId: number, context?: CollectContextValues): Promise<LabRequest> {
  return parseResponse(
    await apiFetch(`/api/lab-request-items/${itemId}/collect`, { method: "POST", body: context ?? {} }),
  );
}

export async function getRequestResults(id: number): Promise<LabResult[]> {
  return parseResponse(await apiFetch(`/api/lab-requests/${id}/results`));
}

export async function createResult(
  itemId: number,
  values: ResultValueInput[],
  conclusion?: string,
): Promise<LabResult> {
  return parseResponse(
    await apiFetch(`/api/lab-request-items/${itemId}/result`, {
      method: "POST",
      body: { values, conclusion: conclusion ?? null },
    }),
  );
}

export async function updateResult(id: number, values: ResultValueInput[]): Promise<LabResult> {
  return parseResponse(
    await apiFetch(`/api/lab-results/${id}`, { method: "PATCH", body: { values } }),
  );
}

export async function getResult(id: number): Promise<LabResult> {
  return parseResponse(await apiFetch(`/api/lab-results/${id}`));
}

export async function validateResult(id: number, conclusion?: string): Promise<LabResult> {
  return parseResponse(
    await apiFetch(`/api/lab-results/${id}/validate`, {
      method: "POST",
      body: { conclusion: conclusion ?? null },
    }),
  );
}

export async function reviseResult(
  id: number,
  reason: string,
  values: ResultValueInput[],
  conclusion?: string,
): Promise<LabResult> {
  return parseResponse(
    await apiFetch(`/api/lab-results/${id}/revise`, {
      method: "POST",
      body: { reason, values, conclusion: conclusion ?? null },
    }),
  );
}

export async function getLabTestDetail(id: number): Promise<LabTestDetail> {
  return parseResponse(await apiFetch(`/api/lab-catalog/${id}`));
}

export async function searchLabTests(q: string): Promise<LabTestSummary[]> {
  return parseResponse(await apiFetch(`/api/lab-catalog/search?q=${encodeURIComponent(q)}`));
}

export async function createLabRequest(data: CreateLabRequestInput): Promise<LabRequest> {
  return parseResponse(await apiFetch("/api/lab-requests", { method: "POST", body: data }));
}

export async function getPatientLabRequests(
  patientId: number | string,
  opts?: { include_cancelled?: boolean; per_page?: number },
): Promise<LabRequestListResponse> {
  const qs = new URLSearchParams();
  if (opts?.include_cancelled) qs.set("include_cancelled", "true");
  if (opts?.per_page) qs.set("per_page", String(opts.per_page));
  const q = qs.toString();
  return parseResponse(await apiFetch(`/api/patients/${patientId}/lab-requests${q ? `?${q}` : ""}`));
}

export async function getEncounterLabRequests(encounterId: number | string): Promise<LabRequestListResponse> {
  return parseResponse(await apiFetch(`/api/encounters/${encounterId}/lab-requests?per_page=50`));
}

export async function cancelLabRequest(id: number, reason?: string): Promise<LabRequest> {
  return parseResponse(
    await apiFetch(`/api/lab-requests/${id}/cancel`, { method: "POST", body: { reason: reason ?? null } }),
  );
}

// ─── Tendances longitudinales (L6) ─────────────────────────────────────────────
export interface LabParameterSummary {
  parameter_code: string;
  loinc_code: string | null;
  name: string;
  unit: string | null;
  value_type: string;
  count: number;
  last_date: string | null;
}

export interface LabTrendContext {
  age_years: number | null;
  sex: string | null;
  weight: number | null;
  height: number | null;
  systolic: number | null;
  diastolic: number | null;
  temperature: number | null;
}

export interface LabTrendPoint {
  date: string | null;
  value_numeric: number | null;
  unit: string | null;
  interpretation: string;
  abnormal: boolean;
  reference_used: string | null;
  context: LabTrendContext;
  lab_result_id: number;
}

export interface ReferenceBand {
  low: number | null;
  high: number | null;
  label: string | null;
}

export interface LabTrendSeries {
  parameter_code: string;
  loinc_code: string | null;
  name: string;
  unit: string | null;
  reference_band: ReferenceBand | null;
  points: LabTrendPoint[];
}

export async function getPatientLabParameters(patientId: number | string): Promise<LabParameterSummary[]> {
  return parseResponse(await apiFetch(`/api/patients/${patientId}/lab-parameters`));
}

export async function getLabParameterSeries(
  patientId: number | string,
  parameterCode: string,
  from?: string,
  to?: string,
): Promise<LabTrendSeries> {
  const sp = new URLSearchParams();
  if (from) sp.set("from", from);
  if (to) sp.set("to", to);
  const qs = sp.toString();
  return parseResponse(
    await apiFetch(
      `/api/patients/${patientId}/lab-parameters/${encodeURIComponent(parameterCode)}/series${qs ? `?${qs}` : ""}`,
    ),
  );
}
