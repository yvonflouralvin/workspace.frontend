import { apiFetch } from "@repo/network/client";
import { ApiError } from "./api";

// ─── Types ──────────────────────────────────────────────────────────────────
export interface DonneesSejour {
  admitted_at: string | null;
  discharged_at: string | null;
  duree_jours: number;
  services: string[];
  discharge_type: string | null;
  discharge_type_label: string | null;
  diagnostics: { code: string; label: string }[];
  actes_realises: { date: string; libelle: string }[];
  traitement_sortie: { name: string; dosage: string; frequency: string; duration: string }[];
  labo_marquants: { parametre: string; valeur: string; interpretation: string }[];
  constantes_sortie: { code: string; value: number; unit: string; measured_at: string | null }[];
}

export interface Addendum {
  id: number;
  compte_rendu_id: number;
  texte: string;
  created_by: number;
  created_at: string | null;
}

export interface CompteRendu {
  id: number;
  workspace_id: number;
  sejour_id: number;
  patient_id: number;
  motif_hospitalisation: string | null;
  antecedents_pertinents: string | null;
  evolution_sejour: string | null;
  examens_realises: string | null;
  conclusion: string | null;
  traitement_sortie: string | null;
  conduite_a_tenir: string | null;
  destinataire: string | null;
  signed: boolean;
  signed_at: string | null;
  signed_by: number | null;
  document_id: string | null;
  created_at: string | null;
  updated_at: string | null;
  donnees_sejour: DonneesSejour;
  addendums: Addendum[];
}

export interface CompteRenduUpdate {
  motif_hospitalisation?: string | null;
  antecedents_pertinents?: string | null;
  evolution_sejour?: string | null;
  examens_realises?: string | null;
  conclusion?: string | null;
  traitement_sortie?: string | null;
  conduite_a_tenir?: string | null;
  destinataire?: string | null;
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

// ─── API ─────────────────────────────────────────────────────────────────────
export async function getCompteRendu(sejourId: number | string): Promise<CompteRendu> {
  return parseJson<CompteRendu>(await apiFetch(`/api/sejours/${sejourId}/compte-rendu`));
}

export async function creerCompteRendu(sejourId: number | string): Promise<CompteRendu> {
  return parseJson<CompteRendu>(
    await apiFetch(`/api/sejours/${sejourId}/compte-rendu`, { method: "POST", body: {} }),
  );
}

export async function updateCompteRendu(id: number, body: CompteRenduUpdate): Promise<CompteRendu> {
  return parseJson<CompteRendu>(
    await apiFetch(`/api/compte-rendus/${id}`, { method: "PATCH", body }),
  );
}

export async function signerCompteRendu(id: number): Promise<CompteRendu> {
  return parseJson<CompteRendu>(
    await apiFetch(`/api/compte-rendus/${id}/signer`, { method: "POST", body: {} }),
  );
}

export async function amenderCompteRendu(id: number, texte: string): Promise<CompteRendu> {
  return parseJson<CompteRendu>(
    await apiFetch(`/api/compte-rendus/${id}/amender`, { method: "POST", body: { texte } }),
  );
}

export async function downloadCompteRenduPdf(id: number): Promise<void> {
  const res = await fetch(`/api/compte-rendus/${id}/pdf`, { credentials: "include" });
  if (!res.ok) throw new Error("Impossible de générer la lettre de sortie.");
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  window.open(url, "_blank");
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}
