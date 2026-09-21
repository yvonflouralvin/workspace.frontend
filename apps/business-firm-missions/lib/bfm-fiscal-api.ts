"use client";

import { apiFetch } from "@repo/network/client";

export type FrequenceObligation = "MENSUELLE" | "TRIMESTRIELLE" | "ANNUELLE" | "PONCTUELLE";
export type TypeEcheance = "DECLARATION" | "PAIEMENT" | "AUTRE";
export type StatutEcheance = "A_FAIRE" | "EN_COURS" | "FAIT" | "EN_RETARD";
export type StatutDeclaration = "A_FAIRE" | "EN_COURS" | "DEPOSEE" | "EN_RETARD";
export type TypeCorrespondance = "CLIENT" | "ADMINISTRATION";
export type StatutPenalite = "EN_ATTENTE" | "PAYEE";
export type StatutControleFiscal = "ANNONCE" | "EN_COURS" | "CLOTURE";

export const FREQUENCE_LABELS: Record<FrequenceObligation, string> = {
  MENSUELLE: "Mensuelle",
  TRIMESTRIELLE: "Trimestrielle",
  ANNUELLE: "Annuelle",
  PONCTUELLE: "Ponctuelle",
};

export const STATUT_ECHEANCE_LABELS: Record<StatutEcheance, string> = {
  A_FAIRE: "À faire",
  EN_COURS: "En cours",
  FAIT: "Fait",
  EN_RETARD: "En retard",
};

export const STATUT_DECLARATION_LABELS: Record<StatutDeclaration, string> = {
  A_FAIRE: "À faire",
  EN_COURS: "En cours",
  DEPOSEE: "Déposée",
  EN_RETARD: "En retard",
};

export const TYPE_ECHEANCE_LABELS: Record<TypeEcheance, string> = {
  DECLARATION: "Déclaration",
  PAIEMENT: "Paiement",
  AUTRE: "Autre",
};

export const TYPE_CORRESPONDANCE_LABELS: Record<TypeCorrespondance, string> = {
  CLIENT: "Client",
  ADMINISTRATION: "Administration",
};

export const STATUT_PENALITE_LABELS: Record<StatutPenalite, string> = {
  EN_ATTENTE: "En attente",
  PAYEE: "Payée",
};

export const STATUT_CONTROLE_LABELS: Record<StatutControleFiscal, string> = {
  ANNONCE: "Annoncé",
  EN_COURS: "En cours",
  CLOTURE: "Clôturé",
};

export interface Dossier {
  id: number;
  workspace_id: number;
  tiers_id: number | null;
  nom: string;
  notes: string | null;
  created_at: string;
}

export interface DossierSummary {
  id: number;
  tiers_id: number | null;
  nom: string;
  echeances_a_venir: number;
  echeances_en_retard: number;
}

export async function listDossiers(tiersId?: number): Promise<DossierSummary[]> {
  const qs = new URLSearchParams();
  if (tiersId) qs.set("tiers_id", String(tiersId));
  const res = await apiFetch(`/api/bfm/fiscal/dossiers?${qs}`);
  if (!res.ok) return [];
  return res.json();
}

export async function getDossier(id: number): Promise<Dossier> {
  const res = await apiFetch(`/api/bfm/fiscal/dossiers/${id}`);
  if (!res.ok) throw new Error("Dossier fiscal introuvable");
  return res.json();
}

export async function createDossier(input: { nom: string; tiers_id?: number; notes?: string }): Promise<Dossier> {
  const res = await apiFetch("/api/bfm/fiscal/dossiers", { method: "POST", body: input });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail ?? "Erreur lors de la création du dossier fiscal");
  }
  return res.json();
}

export async function updateDossier(id: number, input: Partial<{ nom: string; notes: string }>): Promise<Dossier> {
  const res = await apiFetch(`/api/bfm/fiscal/dossiers/${id}`, { method: "PUT", body: input });
  if (!res.ok) throw new Error("Erreur lors de la mise à jour du dossier fiscal");
  return res.json();
}

// ───────────────────────── Échéances à venir (global) ─────────────────────────

export interface Echeance {
  id: number;
  dossier_id: number;
  obligation_id: number | null;
  type: TypeEcheance;
  nom: string;
  date_limite: string;
  statut: StatutEcheance;
  responsable_user_id: number | null;
}

export async function echeancesAVenir(jours = 15): Promise<Echeance[]> {
  const res = await apiFetch(`/api/bfm/fiscal/echeances-a-venir?jours=${jours}`);
  if (!res.ok) return [];
  return res.json();
}

// ───────────────────────── Obligations ─────────────────────────

export interface Obligation {
  id: number;
  dossier_id: number;
  nom: string;
  frequence: FrequenceObligation;
  responsable_user_id: number | null;
  description: string | null;
}

export async function listObligations(dossierId: number): Promise<Obligation[]> {
  const res = await apiFetch(`/api/bfm/fiscal/dossiers/${dossierId}/obligations`);
  if (!res.ok) return [];
  return res.json();
}

export async function createObligation(
  dossierId: number,
  input: { nom: string; frequence?: FrequenceObligation; responsable_user_id?: number; description?: string },
): Promise<Obligation> {
  const res = await apiFetch(`/api/bfm/fiscal/dossiers/${dossierId}/obligations`, { method: "POST", body: input });
  if (!res.ok) throw new Error("Erreur lors de la création de l'obligation");
  return res.json();
}

export async function updateObligation(
  dossierId: number,
  obligationId: number,
  input: Partial<Obligation>,
): Promise<Obligation> {
  const res = await apiFetch(`/api/bfm/fiscal/dossiers/${dossierId}/obligations/${obligationId}`, {
    method: "PUT",
    body: input,
  });
  if (!res.ok) throw new Error("Erreur lors de la mise à jour de l'obligation");
  return res.json();
}

// ───────────────────────── Échéances d'un dossier ─────────────────────────

export async function listEcheances(dossierId: number): Promise<Echeance[]> {
  const res = await apiFetch(`/api/bfm/fiscal/dossiers/${dossierId}/echeances`);
  if (!res.ok) return [];
  return res.json();
}

export async function createEcheance(
  dossierId: number,
  input: { type: TypeEcheance; nom: string; date_limite: string; obligation_id?: number; responsable_user_id?: number },
): Promise<Echeance> {
  const res = await apiFetch(`/api/bfm/fiscal/dossiers/${dossierId}/echeances`, { method: "POST", body: input });
  if (!res.ok) throw new Error("Erreur lors de la création de l'échéance");
  return res.json();
}

export async function updateEcheance(dossierId: number, echeanceId: number, input: Partial<Echeance>): Promise<Echeance> {
  const res = await apiFetch(`/api/bfm/fiscal/dossiers/${dossierId}/echeances/${echeanceId}`, { method: "PUT", body: input });
  if (!res.ok) throw new Error("Erreur lors de la mise à jour de l'échéance");
  return res.json();
}

// ───────────────────────── Déclarations ─────────────────────────

export interface Declaration {
  id: number;
  obligation_id: number;
  echeance_id: number | null;
  periode: string;
  statut: StatutDeclaration;
  date_depot: string | null;
  document_id: number | null;
}

export async function listDeclarations(dossierId: number): Promise<Declaration[]> {
  const res = await apiFetch(`/api/bfm/fiscal/dossiers/${dossierId}/declarations`);
  if (!res.ok) return [];
  return res.json();
}

export async function createDeclaration(
  dossierId: number,
  input: { obligation_id: number; echeance_id?: number; periode: string },
): Promise<Declaration> {
  const res = await apiFetch(`/api/bfm/fiscal/dossiers/${dossierId}/declarations`, { method: "POST", body: input });
  if (!res.ok) throw new Error("Erreur lors de la création de la déclaration");
  return res.json();
}

export async function updateDeclaration(
  dossierId: number,
  declarationId: number,
  input: Partial<{ statut: StatutDeclaration; date_depot: string | null; document_id: number }>,
): Promise<Declaration> {
  const res = await apiFetch(`/api/bfm/fiscal/dossiers/${dossierId}/declarations/${declarationId}`, {
    method: "PUT",
    body: input,
  });
  if (!res.ok) throw new Error("Erreur lors de la mise à jour de la déclaration");
  return res.json();
}

// ───────────────────────── Correspondances ─────────────────────────

export interface Correspondance {
  id: number;
  dossier_id: number;
  avec: TypeCorrespondance;
  sujet: string;
  notes: string | null;
  date: string;
  document_id: number | null;
}

export async function listCorrespondances(dossierId: number): Promise<Correspondance[]> {
  const res = await apiFetch(`/api/bfm/fiscal/dossiers/${dossierId}/correspondances`);
  if (!res.ok) return [];
  return res.json();
}

export async function createCorrespondance(
  dossierId: number,
  input: { avec: TypeCorrespondance; sujet: string; notes?: string; date: string },
): Promise<Correspondance> {
  const res = await apiFetch(`/api/bfm/fiscal/dossiers/${dossierId}/correspondances`, { method: "POST", body: input });
  if (!res.ok) throw new Error("Erreur lors de la création de la correspondance");
  return res.json();
}

export async function updateCorrespondance(
  dossierId: number,
  correspondanceId: number,
  input: Partial<{ avec: TypeCorrespondance; sujet: string; notes: string | null; date: string }>,
): Promise<Correspondance> {
  const res = await apiFetch(`/api/bfm/fiscal/dossiers/${dossierId}/correspondances/${correspondanceId}`, {
    method: "PUT",
    body: input,
  });
  if (!res.ok) throw new Error("Erreur lors de la mise à jour de la correspondance");
  return res.json();
}

// ───────────────────────── Paiements ─────────────────────────

export interface PaiementFiscal {
  id: number;
  dossier_id: number;
  declaration_id: number | null;
  montant: number;
  date_paiement: string;
  mode: string | null;
}

export async function listPaiementsFiscaux(dossierId: number): Promise<PaiementFiscal[]> {
  const res = await apiFetch(`/api/bfm/fiscal/dossiers/${dossierId}/paiements`);
  if (!res.ok) return [];
  return res.json();
}

export async function createPaiementFiscal(
  dossierId: number,
  input: { montant: number; date_paiement: string; mode?: string; declaration_id?: number },
): Promise<PaiementFiscal> {
  const res = await apiFetch(`/api/bfm/fiscal/dossiers/${dossierId}/paiements`, { method: "POST", body: input });
  if (!res.ok) throw new Error("Erreur lors de la création du paiement");
  return res.json();
}

export async function updatePaiementFiscal(
  dossierId: number,
  paiementId: number,
  input: Partial<{ montant: number; date_paiement: string; mode: string | null }>,
): Promise<PaiementFiscal> {
  const res = await apiFetch(`/api/bfm/fiscal/dossiers/${dossierId}/paiements/${paiementId}`, {
    method: "PUT",
    body: input,
  });
  if (!res.ok) throw new Error("Erreur lors de la mise à jour du paiement");
  return res.json();
}

// ───────────────────────── Pénalités ─────────────────────────

export interface Penalite {
  id: number;
  dossier_id: number;
  declaration_id: number | null;
  motif: string;
  montant: number;
  date: string;
  statut: StatutPenalite;
}

export async function listPenalites(dossierId: number): Promise<Penalite[]> {
  const res = await apiFetch(`/api/bfm/fiscal/dossiers/${dossierId}/penalites`);
  if (!res.ok) return [];
  return res.json();
}

export async function createPenalite(
  dossierId: number,
  input: { motif: string; montant: number; date: string; declaration_id?: number },
): Promise<Penalite> {
  const res = await apiFetch(`/api/bfm/fiscal/dossiers/${dossierId}/penalites`, { method: "POST", body: input });
  if (!res.ok) throw new Error("Erreur lors de la création de la pénalité");
  return res.json();
}

export async function updatePenalite(
  dossierId: number,
  penaliteId: number,
  input: Partial<{ motif: string; montant: number; date: string; statut: StatutPenalite }>,
): Promise<Penalite> {
  const res = await apiFetch(`/api/bfm/fiscal/dossiers/${dossierId}/penalites/${penaliteId}`, {
    method: "PUT",
    body: input,
  });
  if (!res.ok) throw new Error("Erreur lors de la mise à jour de la pénalité");
  return res.json();
}

// ───────────────────────── Contrôles fiscaux ─────────────────────────

export interface ControleFiscal {
  id: number;
  dossier_id: number;
  type_controle: string | null;
  date_debut: string | null;
  date_fin: string | null;
  administration: string | null;
  resultat: string | null;
  statut: StatutControleFiscal;
}

export async function listControlesFiscaux(dossierId: number): Promise<ControleFiscal[]> {
  const res = await apiFetch(`/api/bfm/fiscal/dossiers/${dossierId}/controles`);
  if (!res.ok) return [];
  return res.json();
}

export async function createControleFiscal(
  dossierId: number,
  input: { type_controle?: string; date_debut?: string; date_fin?: string; administration?: string },
): Promise<ControleFiscal> {
  const res = await apiFetch(`/api/bfm/fiscal/dossiers/${dossierId}/controles`, { method: "POST", body: input });
  if (!res.ok) throw new Error("Erreur lors de la création du contrôle fiscal");
  return res.json();
}

export async function updateControleFiscal(
  dossierId: number,
  controleId: number,
  input: Partial<ControleFiscal>,
): Promise<ControleFiscal> {
  const res = await apiFetch(`/api/bfm/fiscal/dossiers/${dossierId}/controles/${controleId}`, {
    method: "PUT",
    body: input,
  });
  if (!res.ok) throw new Error("Erreur lors de la mise à jour du contrôle fiscal");
  return res.json();
}
