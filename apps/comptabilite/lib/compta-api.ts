"use client";

import { apiFetch } from "@repo/network/client";

// ───────────────────────── Comptes ─────────────────────────

export type TypeCompte = "ACTIF" | "PASSIF" | "CHARGE" | "PRODUIT" | "AUTRE";
export type SensNormal = "DEBIT" | "CREDIT";

export const TYPE_COMPTE_LABELS: Record<TypeCompte, string> = {
  ACTIF: "Actif",
  PASSIF: "Passif",
  CHARGE: "Charge",
  PRODUIT: "Produit",
  AUTRE: "Autre (HAO)",
};

export interface Compte {
  id: number;
  numero: string;
  libelle: string;
  classe: number;
  type_compte: TypeCompte;
  sens_normal: SensNormal;
  lettrable: boolean;
  compte_parent_id: number | null;
  actif: boolean;
}

export interface CompteInput {
  numero: string;
  libelle: string;
  classe: number;
  type_compte: TypeCompte;
  sens_normal: SensNormal;
  lettrable?: boolean;
  compte_parent_id?: number | null;
}

export async function listComptes(params?: { classe?: number; actif?: boolean; q?: string }): Promise<Compte[]> {
  const qs = new URLSearchParams();
  if (params?.classe != null) qs.set("classe", String(params.classe));
  if (params?.actif != null) qs.set("actif", String(params.actif));
  if (params?.q) qs.set("q", params.q);
  const res = await apiFetch(`/api/compta/comptes?${qs}`);
  if (!res.ok) return [];
  return res.json();
}

export async function createCompte(input: CompteInput): Promise<Compte> {
  const res = await apiFetch("/api/compta/comptes", { method: "POST", body: input });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail ?? "Erreur lors de la création du compte");
  }
  return res.json();
}

export async function updateCompte(id: number, patch: Partial<CompteInput> & { actif?: boolean }): Promise<Compte> {
  const res = await apiFetch(`/api/compta/comptes/${id}`, { method: "PUT", body: patch });
  if (!res.ok) throw new Error("Erreur lors de la mise à jour du compte");
  return res.json();
}

export async function toggleCompteActif(compte: Compte): Promise<Compte> {
  return updateCompte(compte.id, { actif: !compte.actif });
}

export async function chargerReferentiel(referentielId: number): Promise<Compte[]> {
  const res = await apiFetch(`/api/compta/comptes/charger-referentiel/${referentielId}`, { method: "POST" });
  if (!res.ok) throw new Error("Erreur lors du chargement du référentiel");
  return res.json();
}

// ───────────────────────── Référentiels ─────────────────────────

export interface Referentiel {
  id: number;
  code: string;
  nom: string;
  description: string | null;
  systeme: boolean;
  base_referentiel_id: number | null;
  nombre_comptes: number;
}

export interface ReferentielCompte {
  id: number;
  numero: string;
  libelle: string;
  classe: number;
  type_compte: TypeCompte;
  sens_normal: SensNormal;
  lettrable: boolean;
}

export async function listReferentiels(): Promise<Referentiel[]> {
  const res = await apiFetch("/api/compta/referentiels");
  if (!res.ok) return [];
  return res.json();
}

export async function createReferentiel(input: { nom: string; description?: string; base_referentiel_id?: number | null }): Promise<Referentiel> {
  const res = await apiFetch("/api/compta/referentiels", { method: "POST", body: input });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail ?? "Erreur lors de la création du référentiel");
  }
  return res.json();
}

export async function deleteReferentiel(id: number): Promise<void> {
  const res = await apiFetch(`/api/compta/referentiels/${id}`, { method: "DELETE" });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail ?? "Erreur lors de la suppression du référentiel");
  }
}

export async function listReferentielComptes(id: number): Promise<ReferentielCompte[]> {
  const res = await apiFetch(`/api/compta/referentiels/${id}/comptes`);
  if (!res.ok) return [];
  return res.json();
}

export interface ImportReferentielResult {
  crees: number;
  mis_a_jour: number;
  total: number;
}

export async function importerReferentielExcel(id: number, fichier: File): Promise<ImportReferentielResult> {
  const form = new FormData();
  form.append("fichier", fichier);
  const res = await fetch(`/api/compta/referentiels/${id}/comptes/import`, { method: "POST", body: form });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.detail ?? "Erreur lors de l'import");
  return data;
}

// ───────────────────────── Journaux ─────────────────────────

export type TypeJournal = "ACHATS" | "VENTES" | "BANQUE" | "CAISSE" | "OD" | "A_NOUVEAU";

export const TYPE_JOURNAL_LABELS: Record<TypeJournal, string> = {
  ACHATS: "Achats",
  VENTES: "Ventes",
  BANQUE: "Banque",
  CAISSE: "Caisse",
  OD: "Opérations diverses",
  A_NOUVEAU: "À nouveaux",
};

export interface Journal {
  id: number;
  code: string;
  libelle: string;
  type_journal: TypeJournal;
  compte_contrepartie_id: number | null;
  actif: boolean;
}

export async function listJournaux(): Promise<Journal[]> {
  const res = await apiFetch("/api/compta/journaux");
  if (!res.ok) return [];
  return res.json();
}

export async function createJournal(input: { code: string; libelle: string; type_journal: TypeJournal }): Promise<Journal> {
  const res = await apiFetch("/api/compta/journaux", { method: "POST", body: input });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail ?? "Erreur lors de la création du journal");
  }
  return res.json();
}

export async function chargerJournauxDefaut(): Promise<Journal[]> {
  const res = await apiFetch("/api/compta/journaux/charger-defaut", { method: "POST" });
  if (!res.ok) throw new Error("Erreur lors du chargement des journaux par défaut");
  return res.json();
}

// ───────────────────────── Exercices ─────────────────────────

export type StatutExercice = "OUVERT" | "CLOTURE";

export interface Exercice {
  id: number;
  libelle: string;
  date_debut: string;
  date_fin: string;
  statut: StatutExercice;
}

export async function listExercices(): Promise<Exercice[]> {
  const res = await apiFetch("/api/compta/exercices");
  if (!res.ok) return [];
  return res.json();
}

export async function createExercice(input: { libelle: string; date_debut: string; date_fin: string }): Promise<Exercice> {
  const res = await apiFetch("/api/compta/exercices", { method: "POST", body: input });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail ?? "Erreur lors de la création de l'exercice");
  }
  return res.json();
}

export async function cloturerExercice(id: number): Promise<Exercice> {
  const res = await apiFetch(`/api/compta/exercices/${id}/cloturer`, { method: "POST" });
  if (!res.ok) throw new Error("Erreur lors de la clôture de l'exercice");
  return res.json();
}

// ───────────────────────── Écritures ─────────────────────────

export type StatutEcriture = "BROUILLON" | "VALIDEE" | "CONTREPASSEE";

export const STATUT_ECRITURE_LABELS: Record<StatutEcriture, string> = {
  BROUILLON: "Brouillon",
  VALIDEE: "Validée",
  CONTREPASSEE: "Contre-passée",
};

export interface LigneEcritureInput {
  compte_id: number;
  tiers_id?: number | null;
  libelle?: string | null;
  debit: number;
  credit: number;
}

export interface LigneEcriture extends LigneEcritureInput {
  id: number;
  compte_numero: string | null;
  compte_libelle: string | null;
  lettrage: string | null;
  position: number;
}

export interface EcritureInput {
  journal_id: number;
  exercice_id: number;
  date_ecriture: string;
  libelle: string;
  reference?: string | null;
  lignes: LigneEcritureInput[];
}

export interface Ecriture {
  id: number;
  numero: string;
  journal_id: number;
  exercice_id: number;
  date_ecriture: string;
  libelle: string;
  reference: string | null;
  statut: StatutEcriture;
  ecriture_annulee_id: number | null;
  created_by: number | null;
  created_at: string;
  lignes: LigneEcriture[];
  total_debit: number;
  total_credit: number;
}

export interface EcritureSummary {
  id: number;
  numero: string;
  journal_id: number;
  date_ecriture: string;
  libelle: string;
  reference: string | null;
  statut: StatutEcriture;
  total_debit: number;
  total_credit: number;
}

export async function listEcritures(params?: { journal_id?: number; exercice_id?: number; statut?: StatutEcriture }): Promise<EcritureSummary[]> {
  const qs = new URLSearchParams();
  if (params?.journal_id) qs.set("journal_id", String(params.journal_id));
  if (params?.exercice_id) qs.set("exercice_id", String(params.exercice_id));
  if (params?.statut) qs.set("statut", params.statut);
  const res = await apiFetch(`/api/compta/ecritures?${qs}`);
  if (!res.ok) return [];
  return res.json();
}

export async function getEcriture(id: number): Promise<Ecriture> {
  const res = await apiFetch(`/api/compta/ecritures/${id}`);
  if (!res.ok) throw new Error("Écriture introuvable");
  return res.json();
}

export async function createEcriture(input: EcritureInput): Promise<Ecriture> {
  const res = await apiFetch("/api/compta/ecritures", { method: "POST", body: input });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail ?? "Erreur lors de la création de l'écriture");
  }
  return res.json();
}

export async function updateEcriture(id: number, input: EcritureInput): Promise<Ecriture> {
  const res = await apiFetch(`/api/compta/ecritures/${id}`, { method: "PUT", body: input });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail ?? "Erreur lors de la mise à jour de l'écriture");
  }
  return res.json();
}

export async function deleteEcriture(id: number): Promise<void> {
  const res = await apiFetch(`/api/compta/ecritures/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error("Erreur lors de la suppression");
}

export async function validerEcriture(id: number): Promise<Ecriture> {
  const res = await apiFetch(`/api/compta/ecritures/${id}/valider`, { method: "POST" });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail ?? "Erreur lors de la validation");
  }
  return res.json();
}

export async function contrePasserEcriture(id: number): Promise<Ecriture> {
  const res = await apiFetch(`/api/compta/ecritures/${id}/contre-passer`, { method: "POST" });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail ?? "Erreur lors de la contre-passation");
  }
  return res.json();
}

export async function lettrerLignes(ligneIds: number[]): Promise<void> {
  const res = await apiFetch("/api/compta/lignes/lettrer", { method: "POST", body: { ligne_ids: ligneIds } });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail ?? "Erreur lors du lettrage");
  }
}

export async function delettrerLigne(ligneId: number): Promise<void> {
  const res = await apiFetch(`/api/compta/lignes/${ligneId}/delettrer`, { method: "POST" });
  if (!res.ok) throw new Error("Erreur lors du délettrage");
}

// ───────────────────────── Grand livre / Balance ─────────────────────────

export interface MouvementGrandLivre {
  ecriture_id: number;
  ecriture_numero: string;
  date_ecriture: string;
  journal_code: string;
  libelle: string;
  tiers_id: number | null;
  debit: number;
  credit: number;
  solde_cumule: number;
  lettrage: string | null;
}

export async function grandLivre(compteId: number, exerciceId: number): Promise<MouvementGrandLivre[]> {
  const qs = new URLSearchParams({ compte_id: String(compteId), exercice_id: String(exerciceId) });
  const res = await apiFetch(`/api/compta/grand-livre?${qs}`);
  if (!res.ok) return [];
  return res.json();
}

export interface LigneBalance {
  compte_id: number;
  numero: string;
  libelle: string;
  total_debit: number;
  total_credit: number;
  solde_debiteur: number;
  solde_crediteur: number;
}

export async function getBalance(exerciceId: number): Promise<LigneBalance[]> {
  const qs = new URLSearchParams({ exercice_id: String(exerciceId) });
  const res = await apiFetch(`/api/compta/balance?${qs}`);
  if (!res.ok) return [];
  return res.json();
}

// ───────────────────────── États financiers ─────────────────────────

export interface LigneEtat {
  classe: number;
  libelle: string;
  montant: number;
}

export interface EtatFinancier {
  exercice_id: number;
  generated_at: string;
  lignes: LigneEtat[];
  total: number;
}

export async function getBilan(exerciceId: number): Promise<EtatFinancier> {
  const qs = new URLSearchParams({ exercice_id: String(exerciceId) });
  const res = await apiFetch(`/api/compta/bilan?${qs}`);
  if (!res.ok) throw new Error("Erreur lors du calcul du bilan");
  return res.json();
}

export async function getCompteResultat(exerciceId: number): Promise<EtatFinancier> {
  const qs = new URLSearchParams({ exercice_id: String(exerciceId) });
  const res = await apiFetch(`/api/compta/compte-resultat?${qs}`);
  if (!res.ok) throw new Error("Erreur lors du calcul du compte de résultat");
  return res.json();
}

// ───────────────────────── Taxes ─────────────────────────

export interface Taxe {
  id: number;
  nom: string;
  taux: number;
  compte_collecte_id: number | null;
  compte_deductible_id: number | null;
  actif: boolean;
}

export async function listTaxes(): Promise<Taxe[]> {
  const res = await apiFetch("/api/compta/taxes");
  if (!res.ok) return [];
  return res.json();
}

export async function createTaxe(input: { nom: string; taux: number; compte_collecte_id?: number | null; compte_deductible_id?: number | null }): Promise<Taxe> {
  const res = await apiFetch("/api/compta/taxes", { method: "POST", body: input });
  if (!res.ok) throw new Error("Erreur lors de la création de la taxe");
  return res.json();
}

export async function chargerTaxeDefaut(): Promise<Taxe[]> {
  const res = await apiFetch("/api/compta/taxes/charger-defaut", { method: "POST" });
  if (!res.ok) throw new Error("Erreur lors du chargement de la TVA par défaut");
  return res.json();
}

// ───────────────────────── Comptabilisation ventes ─────────────────────────

export interface FactureAComptabiliser {
  id: number;
  code: string;
  date_facture: string | null;
  montant_total: number;
  client_nom: string | null;
  deja_comptabilisee: boolean;
}

export async function listFacturesAComptabiliser(): Promise<FactureAComptabiliser[]> {
  const res = await apiFetch("/api/compta/factures-a-comptabiliser");
  if (!res.ok) return [];
  return res.json();
}

export async function comptabiliserFacture(
  factureId: number,
  input: { journal_id: number; exercice_id: number; compte_client_id: number; compte_vente_id: number; taxe_id?: number | null },
): Promise<Ecriture> {
  const res = await apiFetch(`/api/compta/factures/${factureId}/comptabiliser`, { method: "POST", body: input });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail ?? "Erreur lors de la comptabilisation");
  }
  return res.json();
}

export async function logout(): Promise<void> {
  await apiFetch("/api/auth/logout", { method: "POST" });
}
