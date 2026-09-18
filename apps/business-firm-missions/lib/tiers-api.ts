"use client";

import { apiFetch } from "@repo/network/client";

export type TypeTiers = "CLIENT" | "FOURNISSEUR" | "LES_DEUX";
export type CategorieTiers = "ENTREPRISE" | "PARTICULIER";

export interface TiersSummary {
  id: number;
  code: string;
  type: TypeTiers;
  categorie: CategorieTiers;
  nom: string;
  email: string | null;
  telephone: string | null;
  adresse_ville: string | null;
  secteur_activite: string | null;
  is_active: boolean;
}

export interface TiersDetail extends TiersSummary {
  workspace_id: number;
  telephone2: string | null;
  adresse_ligne1: string | null;
  adresse_province: string | null;
  adresse_pays: string | null;
  numero_contribuable: string | null;
  rccm: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export const TYPE_LABELS: Record<TypeTiers, string> = {
  CLIENT: "Client",
  FOURNISSEUR: "Fournisseur",
  LES_DEUX: "Client & fournisseur",
};

export interface TiersPage {
  items: TiersSummary[];
  total: number;
  page: number;
  pages: number;
}

export interface TiersCreateInput {
  type?: TypeTiers;
  categorie?: CategorieTiers;
  nom: string;
  email?: string;
  telephone?: string;
  telephone2?: string;
  adresse_ligne1?: string;
  adresse_ville?: string;
  adresse_province?: string;
  adresse_pays?: string;
  numero_contribuable?: string;
  rccm?: string;
  secteur_activite?: string;
  notes?: string;
}

export type TiersUpdateInput = Partial<TiersCreateInput & { is_active: boolean }>;

export async function listTiers(params?: {
  q?: string;
  type?: TypeTiers;
  actif?: boolean;
  page?: number;
  page_size?: number;
}): Promise<TiersPage> {
  const qs = new URLSearchParams();
  if (params?.q) qs.set("q", params.q);
  if (params?.type) qs.set("type", params.type);
  if (params?.actif !== undefined) qs.set("actif", String(params.actif));
  if (params?.page) qs.set("page", String(params.page));
  if (params?.page_size) qs.set("page_size", String(params.page_size));
  const res = await apiFetch(`/api/tiers?${qs}`);
  if (!res.ok) throw new Error("Erreur lors du chargement des clients");
  return res.json();
}

export async function searchTiers(q: string): Promise<{ id: number; code: string; nom: string; type: TypeTiers }[]> {
  const res = await apiFetch(`/api/tiers/search?q=${encodeURIComponent(q)}`);
  if (!res.ok) return [];
  return res.json();
}

export async function getTiers(id: number): Promise<TiersDetail> {
  const res = await apiFetch(`/api/tiers/${id}`);
  if (!res.ok) throw new Error("Client introuvable");
  return res.json();
}

export async function createTiers(input: TiersCreateInput): Promise<TiersDetail> {
  const res = await apiFetch("/api/tiers", { method: "POST", body: input });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail ?? "Erreur lors de la création du client");
  }
  return res.json();
}

export async function updateTiers(id: number, input: TiersUpdateInput): Promise<TiersDetail> {
  const res = await apiFetch(`/api/tiers/${id}`, { method: "PUT", body: input });
  if (!res.ok) throw new Error("Erreur lors de la mise à jour du client");
  return res.json();
}

// ───────────────────────── Contacts ─────────────────────────

export interface Contact {
  id: number;
  tiers_id: number;
  nom: string;
  fonction: string | null;
  telephone: string | null;
  email: string | null;
  adresse_bureau: string | null;
}

export async function listContacts(tiersId: number): Promise<Contact[]> {
  const res = await apiFetch(`/api/tiers/${tiersId}/contacts`);
  if (!res.ok) return [];
  return res.json();
}

export async function createContact(tiersId: number, input: Omit<Contact, "id" | "tiers_id">): Promise<Contact> {
  const res = await apiFetch(`/api/tiers/${tiersId}/contacts`, { method: "POST", body: input });
  if (!res.ok) throw new Error("Erreur lors de la création du contact");
  return res.json();
}

export async function deleteContact(tiersId: number, contactId: number): Promise<void> {
  await apiFetch(`/api/tiers/${tiersId}/contacts/${contactId}`, { method: "DELETE" });
}

// ───────────────────────── Contrats ─────────────────────────

export type StatutContrat = "ACTIF" | "EXPIRE" | "RESILIE";

export interface Contrat {
  id: number;
  tiers_id: number;
  nom: string;
  type_contrat: string | null;
  date_debut: string | null;
  date_fin: string | null;
  montant: number | null;
  statut: StatutContrat;
  document_id: number | null;
  notes: string | null;
  created_at: string;
}

export async function listContrats(tiersId: number): Promise<Contrat[]> {
  const res = await apiFetch(`/api/tiers/${tiersId}/contrats`);
  if (!res.ok) return [];
  return res.json();
}

export async function createContrat(
  tiersId: number,
  input: { nom: string; type_contrat?: string; date_debut?: string; date_fin?: string; montant?: number; statut?: StatutContrat; notes?: string },
): Promise<Contrat> {
  const res = await apiFetch(`/api/tiers/${tiersId}/contrats`, { method: "POST", body: input });
  if (!res.ok) throw new Error("Erreur lors de la création du contrat");
  return res.json();
}

export async function updateContrat(tiersId: number, contratId: number, input: Partial<Contrat>): Promise<Contrat> {
  const res = await apiFetch(`/api/tiers/${tiersId}/contrats/${contratId}`, { method: "PUT", body: input });
  if (!res.ok) throw new Error("Erreur lors de la mise à jour du contrat");
  return res.json();
}

export async function deleteContrat(tiersId: number, contratId: number): Promise<void> {
  await apiFetch(`/api/tiers/${tiersId}/contrats/${contratId}`, { method: "DELETE" });
}

// ───────────────────────── Services souscrits ─────────────────────────

export type StatutServiceSouscrit = "ACTIF" | "SUSPENDU" | "TERMINE";

export interface ServiceSouscrit {
  id: number;
  tiers_id: number;
  nom: string;
  date_debut: string | null;
  date_fin: string | null;
  statut: StatutServiceSouscrit;
  notes: string | null;
  created_at: string;
}

export async function listServicesSouscrits(tiersId: number): Promise<ServiceSouscrit[]> {
  const res = await apiFetch(`/api/tiers/${tiersId}/services-souscrits`);
  if (!res.ok) return [];
  return res.json();
}

export async function createServiceSouscrit(
  tiersId: number,
  input: { nom: string; date_debut?: string; date_fin?: string; statut?: StatutServiceSouscrit; notes?: string },
): Promise<ServiceSouscrit> {
  const res = await apiFetch(`/api/tiers/${tiersId}/services-souscrits`, { method: "POST", body: input });
  if (!res.ok) throw new Error("Erreur lors de la création du service souscrit");
  return res.json();
}

export async function updateServiceSouscrit(
  tiersId: number,
  serviceId: number,
  input: Partial<ServiceSouscrit>,
): Promise<ServiceSouscrit> {
  const res = await apiFetch(`/api/tiers/${tiersId}/services-souscrits/${serviceId}`, { method: "PUT", body: input });
  if (!res.ok) throw new Error("Erreur lors de la mise à jour du service souscrit");
  return res.json();
}

export async function deleteServiceSouscrit(tiersId: number, serviceId: number): Promise<void> {
  await apiFetch(`/api/tiers/${tiersId}/services-souscrits/${serviceId}`, { method: "DELETE" });
}

// ───────────────────────── Échanges ─────────────────────────

export type TypeEchange = "APPEL" | "EMAIL" | "REUNION" | "AUTRE";

export const TYPE_ECHANGE_LABELS: Record<TypeEchange, string> = {
  APPEL: "Appel",
  EMAIL: "E-mail",
  REUNION: "Réunion",
  AUTRE: "Autre",
};

export interface Echange {
  id: number;
  tiers_id: number;
  contact_id: number | null;
  type: TypeEchange;
  sujet: string;
  notes: string | null;
  date_echange: string;
  created_at: string;
}

export async function listEchanges(tiersId: number): Promise<Echange[]> {
  const res = await apiFetch(`/api/tiers/${tiersId}/echanges`);
  if (!res.ok) return [];
  return res.json();
}

export async function createEchange(
  tiersId: number,
  input: { type: TypeEchange; sujet: string; notes?: string; date_echange: string; contact_id?: number },
): Promise<Echange> {
  const res = await apiFetch(`/api/tiers/${tiersId}/echanges`, { method: "POST", body: input });
  if (!res.ok) throw new Error("Erreur lors de la création de l'échange");
  return res.json();
}

export async function deleteEchange(tiersId: number, echangeId: number): Promise<void> {
  await apiFetch(`/api/tiers/${tiersId}/echanges/${echangeId}`, { method: "DELETE" });
}

// ───────────────────────── Activités (actions réalisées) ─────────────────────────

export interface Activite {
  id: number;
  tiers_id: number;
  action: string;
  user_id: number | null;
  created_at: string;
}

export async function listActivites(tiersId: number): Promise<Activite[]> {
  const res = await apiFetch(`/api/tiers/${tiersId}/activites`);
  if (!res.ok) return [];
  return res.json();
}

export async function logActivite(tiersId: number, action: string): Promise<void> {
  await apiFetch(`/api/tiers/${tiersId}/activites`, { method: "POST", body: { action } });
}

// ───────────────────────── Documents (cross-service) ─────────────────────────

export interface DocumentBrief {
  id: number;
  filename: string;
  content_type: string;
  size_bytes: number;
  category: string | null;
  created_at: string;
}

export async function listTiersDocuments(tiersId: number): Promise<DocumentBrief[]> {
  const res = await apiFetch(`/api/tiers/${tiersId}/documents`);
  if (!res.ok) return [];
  return res.json();
}

// ───────────────────────── Factures (cross-service, Ventes) ─────────────────────────

export interface FactureBrief {
  id: number;
  code: string;
  statut: string;
  date_facture: string | null;
  date_echeance: string | null;
  montant_total: number | string;
  montant_paye: number | string;
}

export async function listFacturesDuClient(tiersId: number): Promise<FactureBrief[]> {
  const qs = new URLSearchParams({ crm_client_id: String(tiersId), page_size: "100" });
  const res = await apiFetch(`/api/ventes-factures?${qs}`);
  if (!res.ok) return [];
  const data = await res.json();
  return data.items ?? [];
}
