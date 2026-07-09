import { apiFetch } from "@repo/network/client";
import { ApiError } from "./api";
import type { AllergyRead, ObservationRead } from "./emr-api";
import type { ActePrescrit } from "./actes-api";

// ─── Types (miroir des schémas backend H5) ─────────────────────────────────────
export type DoseStatus =
  | "A_DONNER" | "DONNEE" | "OMISE" | "REFUSEE" | "SUSPENDUE" | "ANNULEE";

export interface SurveillancePatient {
  id: number;
  dossier_number: string;
  nom: string;
  postnom: string | null;
  prenom: string;
  sexe: string | null;
  age: number | null;
}

export interface SurveillanceHeader {
  sejour_id: number;
  patient: SurveillancePatient;
  service_id: number;
  service_nom: string | null;
  lit_id: number | null;
  lit_numero: string | null;
  chambre_id: number | null;
  chambre_numero: string | null;
  motif_admission: string | null;
  admitted_at: string | null;
  jour_sejour: number;
}

export interface DoseSurveillance {
  id: number;
  plan_id: number;
  scheduled_at: string;
  heure: string;
  status: DoseStatus;
  medication_name: string;
  dose_quantite: number | null;
  dose_unite: string | null;
  voie: string | null;
  en_retard: boolean;
  administered_at: string | null;
  administered_by: number | null;
  dose_reelle: number | null;
  motif: string | null;
  observations: string | null;
}

export interface SurveillanceAlertes {
  doses_en_retard: number;
  actes_en_attente_paiement: number;
  constantes_anormales: string[];
  allergie_critique: boolean;
}

export interface FeuilleSurveillance {
  date: string;
  header: SurveillanceHeader;
  allergies_actives: AllergyRead[];
  doses: DoseSurveillance[];
  actes_a_realiser: ActePrescrit[];
  dernieres_constantes: ObservationRead[];
  alertes: SurveillanceAlertes;
}

export interface PatientCharge {
  sejour_id: number;
  patient: SurveillancePatient;
  lit_numero: string | null;
  chambre_numero: string | null;
  doses_a_donner: number;
  doses_en_retard: number;
  actes_realisables: number;
  allergie_critique: boolean;
  constante_anormale: boolean;
}

export interface ServiceSurveillance {
  service_id: number;
  service_nom: string | null;
  date: string;
  patients: PatientCharge[];
}

export interface CreneauDose {
  sejour_id: number;
  patient_nom: string;
  lit_numero: string | null;
  dose: DoseSurveillance;
}

export interface Creneau {
  heure: string;
  doses: CreneauDose[];
}

export interface ServiceCreneaux {
  service_id: number;
  date: string;
  creneaux: Creneau[];
}

// ─── Helper ─────────────────────────────────────────────────────────────────
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

function qs(date?: string): string {
  return date ? `?date=${encodeURIComponent(date)}` : "";
}

// ─── Lectures ─────────────────────────────────────────────────────────────────
export async function getFeuilleSurveillance(
  sejourId: number | string, date?: string,
): Promise<FeuilleSurveillance> {
  return parseJson<FeuilleSurveillance>(
    await apiFetch(`/api/sejours/${sejourId}/surveillance${qs(date)}`),
  );
}

export async function getServiceSurveillance(
  serviceId: number | string, date?: string,
): Promise<ServiceSurveillance> {
  return parseJson<ServiceSurveillance>(
    await apiFetch(`/api/services/${serviceId}/surveillance${qs(date)}`),
  );
}

export async function getServiceCreneaux(
  serviceId: number | string, date?: string,
): Promise<ServiceCreneaux> {
  return parseJson<ServiceCreneaux>(
    await apiFetch(`/api/services/${serviceId}/surveillance/creneaux${qs(date)}`),
  );
}

// ─── Actions MAR (traçabilité — réutilisées depuis la feuille) ──────────────────
export async function administrerDose(
  doseId: number, body: { administered_at?: string; dose_reelle?: number; observations?: string } = {},
): Promise<DoseSurveillance> {
  return parseJson<DoseSurveillance>(
    await apiFetch(`/api/doses/${doseId}/administrer`, { method: "POST", body }),
  );
}

export async function omettreDose(
  doseId: number, motif: string, observations?: string,
): Promise<DoseSurveillance> {
  return parseJson<DoseSurveillance>(
    await apiFetch(`/api/doses/${doseId}/omettre`, { method: "POST", body: { motif, observations } }),
  );
}

export async function refuserDose(doseId: number, motif: string): Promise<DoseSurveillance> {
  return parseJson<DoseSurveillance>(
    await apiFetch(`/api/doses/${doseId}/refuser`, { method: "POST", body: { motif } }),
  );
}
