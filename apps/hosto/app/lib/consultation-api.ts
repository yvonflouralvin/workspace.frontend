import { apiFetch } from "@repo/network/client";
import { ApiError } from "./api";
import type { EncounterRead } from "./emr-api";
import type { ObservationRead, ClinicalNoteRead } from "./emr-api";
import type { ConditionRead } from "./emr-api";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface TakeVisiteResponse {
  visite_id: number;
  encounter_id: number;
  encounter: EncounterRead;
}

export interface VisiteMini {
  id: number;
  status: string;
  priority: string;
  reason: string | null;
  arrived_at: string;
  taken_at: string | null;
}

export interface PrescriptionMini {
  id: number;
  encounter_id: number;
  status: string;
  created_at: string;
}

export interface ConsultationAggregate {
  encounter: EncounterRead;
  visite: VisiteMini | null;
  observations: ObservationRead[];
  notes: ClinicalNoteRead[];
  conditions: ConditionRead[];
  prescriptions: PrescriptionMini[];
}

// ─── API calls ────────────────────────────────────────────────────────────────

async function parseResponse<T>(res: Response): Promise<T> {
  const data = await res.json();
  if (!res.ok) throw new ApiError(data.detail ?? "Une erreur est survenue", res.status);
  return data as T;
}

export async function takeVisite(visiteId: number): Promise<TakeVisiteResponse> {
  return parseResponse(
    await apiFetch(`/api/visites/${visiteId}/take`, { method: "POST", body: {} }),
  );
}

export async function getConsultation(encounterId: number): Promise<ConsultationAggregate> {
  return parseResponse(await apiFetch(`/api/encounters/${encounterId}/consultation`));
}

// ─── C4 — Clôture, réorientation, annulation ─────────────────────────────────

export interface CloseConsultationBody {
  closure_summary?: string;
}

export interface CloseConsultationResponse {
  encounter: EncounterRead;
  visite_id: number | null;
  warnings: string[];
}

export interface RedirectBody {
  service_id: number;
}

export interface RedirectResponse {
  encounter: EncounterRead;
  visite_id: number | null;
}

export interface CancelBody {
  reason?: string;
}

export interface CancelResponse {
  encounter_id: number;
  status: string;
  visite_id: number | null;
}

export async function closeConsultation(
  encounterId: number,
  body: CloseConsultationBody = {},
): Promise<CloseConsultationResponse> {
  return parseResponse(
    await apiFetch(`/api/encounters/${encounterId}/close-consultation`, {
      method: "POST",
      body,
    }),
  );
}

export async function redirectConsultation(
  encounterId: number,
  body: RedirectBody,
): Promise<RedirectResponse> {
  return parseResponse(
    await apiFetch(`/api/encounters/${encounterId}/redirect`, { method: "POST", body }),
  );
}

export async function cancelConsultation(
  encounterId: number,
  body: CancelBody = {},
): Promise<CancelResponse> {
  return parseResponse(
    await apiFetch(`/api/encounters/${encounterId}/cancel-consultation`, {
      method: "POST",
      body,
    }),
  );
}
