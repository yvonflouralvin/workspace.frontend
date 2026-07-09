"use client";
import { apiFetch } from "@repo/network/client";

export interface Page<T> {
  items: T[];
  total: number;
  page: number;
  pages: number;
}

/* ── Clients (locaux, lien optionnel vers Tiers) ── */
export interface Client {
  id: number;
  nom: string;
  email: string | null;
  telephone: string | null;
  adresse_ville: string | null;
  notes: string | null;
  crm_client_id: number | null;
}
export type ClientRepertoire = Client;
export type ClientDetail = Client;

export interface ClientInput {
  nom: string;
  email?: string | null;
  telephone?: string | null;
  adresse_ville?: string | null;
  notes?: string | null;
}

export async function listClients(params?: {
  q?: string;
  page?: number;
  page_size?: number;
}): Promise<Page<Client>> {
  const qs = new URLSearchParams();
  if (params?.q) qs.set("q", params.q);
  if (params?.page) qs.set("page", String(params.page));
  if (params?.page_size) qs.set("page_size", String(params.page_size));
  const res = await apiFetch(`/api/repertoire/clients?${qs}`);
  if (!res.ok) throw new Error("Erreur lors du chargement des clients");
  return res.json();
}

export async function getClient(id: number): Promise<Client> {
  const res = await apiFetch(`/api/repertoire/clients/${id}`);
  if (!res.ok) throw new Error("Client introuvable");
  return res.json();
}

export async function createClient(input: ClientInput): Promise<Client> {
  const res = await apiFetch("/api/repertoire/clients", { method: "POST", body: input });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail ?? "Erreur lors de la création du client");
  }
  return res.json();
}

export async function updateClient(id: number, patch: Partial<ClientInput>): Promise<Client> {
  const res = await apiFetch(`/api/repertoire/clients/${id}`, { method: "PUT", body: patch });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail ?? "Erreur lors de la mise à jour du client");
  }
  return res.json();
}

// Crée le client dans Tiers si besoin, renvoie l'id Tiers.
export async function ensureClientTiersLink(id: number): Promise<{ crm_client_id: number }> {
  const res = await apiFetch(`/api/repertoire/clients/${id}/lien-tiers`, { method: "POST" });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail ?? "Erreur lors de la liaison avec Tiers");
  }
  return res.json();
}

/* ── Produits (locaux, lien optionnel vers Stock) ── */
export interface Produit {
  id: number;
  nom: string;
  description: string | null;
  unite: string | null;
  categorie_id: number | null;
  categorie_nom: string | null;
  prix_vente: string | number | null;
  tva_applicable: boolean;
  stock_item_id: number | null;
  owner_app_key: string | null;
  locked_fields: string[] | null;
  locked_delete: boolean;
}
export type ProduitRepertoire = Produit;
export type ProduitDetail = Produit;

export interface ProduitInput {
  nom: string;
  description?: string | null;
  unite?: string | null;
  categorie_id?: number | null;
  prix_vente?: number | null;
  tva_applicable?: boolean;
}

/* ── Catégories de produit ── */
export interface Categorie {
  id: number;
  nom: string;
  description: string | null;
  is_active: boolean;
}

export interface CategorieInput {
  nom: string;
  description?: string | null;
  is_active?: boolean;
}

export async function listCategoriesPage(params?: {
  q?: string;
  page?: number;
  page_size?: number;
}): Promise<Page<Categorie>> {
  const qs = new URLSearchParams();
  if (params?.q) qs.set("q", params.q);
  if (params?.page) qs.set("page", String(params.page));
  if (params?.page_size) qs.set("page_size", String(params.page_size));
  const res = await apiFetch(`/api/categories?${qs}`);
  if (!res.ok) throw new Error("Erreur lors du chargement des catégories");
  return res.json();
}

// Toutes les catégories (pour les sélecteurs).
export async function listCategories(): Promise<Categorie[]> {
  const p = await listCategoriesPage({ page_size: 200 });
  return p.items;
}

export async function createCategorie(input: CategorieInput): Promise<Categorie> {
  const res = await apiFetch("/api/categories", { method: "POST", body: input });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail ?? "Erreur lors de la création de la catégorie");
  }
  return res.json();
}

export async function updateCategorie(id: number, patch: Partial<CategorieInput>): Promise<Categorie> {
  const res = await apiFetch(`/api/categories/${id}`, { method: "PUT", body: patch });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail ?? "Erreur lors de la mise à jour de la catégorie");
  }
  return res.json();
}

export async function deleteCategorie(id: number): Promise<void> {
  const res = await apiFetch(`/api/categories/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error("Erreur lors de la suppression de la catégorie");
}

export async function listProduits(params?: {
  q?: string;
  categorie_id?: number;
  sort?: "prix_asc" | "prix_desc";
  page?: number;
  page_size?: number;
}): Promise<Page<Produit>> {
  const qs = new URLSearchParams();
  if (params?.q) qs.set("q", params.q);
  if (params?.categorie_id) qs.set("categorie_id", String(params.categorie_id));
  if (params?.sort) qs.set("sort", params.sort);
  if (params?.page) qs.set("page", String(params.page));
  if (params?.page_size) qs.set("page_size", String(params.page_size));
  const res = await apiFetch(`/api/repertoire/produits?${qs}`);
  if (!res.ok) throw new Error("Erreur lors du chargement des produits");
  return res.json();
}

export async function getProduit(id: number): Promise<Produit> {
  const res = await apiFetch(`/api/repertoire/produits/${id}`);
  if (!res.ok) throw new Error("Produit introuvable");
  return res.json();
}

export async function createProduit(input: ProduitInput): Promise<Produit> {
  const res = await apiFetch("/api/repertoire/produits", { method: "POST", body: input });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail ?? "Erreur lors de la création du produit");
  }
  return res.json();
}

export async function updateProduit(id: number, patch: Partial<ProduitInput>): Promise<Produit> {
  const res = await apiFetch(`/api/repertoire/produits/${id}`, { method: "PUT", body: patch });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail ?? "Erreur lors de la mise à jour du produit");
  }
  return res.json();
}

// Crée le produit dans Stock si besoin, renvoie l'id Stock.
export async function ensureProduitStockLink(id: number): Promise<{ stock_item_id: number }> {
  const res = await apiFetch(`/api/repertoire/produits/${id}/lien-stock`, { method: "POST" });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail ?? "Erreur lors de la liaison avec Stock");
  }
  return res.json();
}

/* ── Commandes ── */
export type StatutCommande = "BROUILLON" | "VALIDEE" | "PARTIELLE" | "PAYEE" | "ANNULEE";

export interface Commande {
  id: number;
  code: string;
  client_id: number | null;
  client_nom: string | null;
  statut: StatutCommande;
  date_commande: string | null;
  montant_total: string | number;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface LigneCommande {
  id: number;
  produit_id: number | null;
  produit_nom: string;
  quantite: string | number;
  prix_unitaire: string | number;
  tva_applicable: boolean;
  total: string | number;
  paye: boolean;
}

export interface FactureBrief {
  id: number;
  code: string;
  date_facture: string | null;
  montant_total: string | number;
  mode_paiement: string | null;
  statut: string;
}

export interface FactureLigneDetail {
  id: number;
  produit_id: number | null;
  produit_nom: string;
  quantite: string | number;
  prix_unitaire: string | number;
  tva_applicable: boolean;
  total: string | number;
}

export interface FactureDetail {
  id: number;
  code: string;
  client_id: number;
  commande_id: number | null;
  statut: string;
  date_facture: string | null;
  date_echeance: string | null;
  montant_total: string | number;
  montant_paye: string | number;
  mode_paiement: string | null;
  tva_taux: string | number | null;
  devises_snapshot: { devise_base?: string; devises?: DeviseEntry[] } | null;
  client: { id: number; nom: string; email: string | null; telephone: string | null; adresse_ville: string | null } | null;
  lignes: FactureLigneDetail[];
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export async function getFactureDetail(id: number): Promise<FactureDetail> {
  const res = await apiFetch(`/api/factures/${id}/detail`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail ?? "Facture introuvable");
  }
  return res.json();
}

export interface CommandeClient {
  id: number;
  nom: string;
  email: string | null;
  telephone: string | null;
  adresse_ville: string | null;
}

export interface CommandeDetail extends Commande {
  client: CommandeClient | null;
  lignes: LigneCommande[];
  factures: FactureBrief[];
}

export interface CommandeInput {
  client_id?: number | null;
  date_commande?: string | null;
  statut?: StatutCommande;
  notes?: string | null;
}

export async function listCommandes(params?: {
  statut?: StatutCommande;
  client_id?: number;
  client?: string;
  date_from?: string;
  date_to?: string;
  page?: number;
  page_size?: number;
}): Promise<Page<Commande>> {
  const qs = new URLSearchParams();
  if (params?.statut) qs.set("statut", params.statut);
  if (params?.client_id) qs.set("client_id", String(params.client_id));
  if (params?.client) qs.set("client", params.client);
  if (params?.date_from) qs.set("date_from", params.date_from);
  if (params?.date_to) qs.set("date_to", params.date_to);
  if (params?.page) qs.set("page", String(params.page));
  if (params?.page_size) qs.set("page_size", String(params.page_size));
  const res = await apiFetch(`/api/commandes?${qs}`);
  if (!res.ok) throw new Error("Erreur lors du chargement des commandes");
  return res.json();
}

export async function getCommande(id: number): Promise<CommandeDetail> {
  const res = await apiFetch(`/api/commandes/${id}`);
  if (!res.ok) throw new Error("Commande introuvable");
  return res.json();
}

export async function createCommande(input?: CommandeInput): Promise<CommandeDetail> {
  const res = await apiFetch("/api/commandes", { method: "POST", body: input ?? {} });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail ?? "Erreur lors de la création de la commande");
  }
  return res.json();
}

export async function updateCommande(id: number, patch: Partial<CommandeInput>): Promise<CommandeDetail> {
  const res = await apiFetch(`/api/commandes/${id}`, { method: "PUT", body: patch });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail ?? "Erreur lors de la mise à jour de la commande");
  }
  return res.json();
}

export async function addLigneCommande(
  commandeId: number,
  input: { produit_id: number; quantite: number },
): Promise<CommandeDetail> {
  const res = await apiFetch(`/api/commandes/${commandeId}/lignes`, { method: "POST", body: input });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail ?? "Erreur lors de l'ajout de la ligne");
  }
  return res.json();
}

export async function updateLigneCommande(
  commandeId: number,
  ligneId: number,
  quantite: number,
): Promise<CommandeDetail> {
  const res = await apiFetch(`/api/commandes/${commandeId}/lignes/${ligneId}`, {
    method: "PUT",
    body: { quantite },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail ?? "Erreur lors de la mise à jour de la ligne");
  }
  return res.json();
}

export async function deleteLigneCommande(commandeId: number, ligneId: number): Promise<CommandeDetail> {
  const res = await apiFetch(`/api/commandes/${commandeId}/lignes/${ligneId}`, { method: "DELETE" });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail ?? "Erreur lors de la suppression de la ligne");
  }
  return res.json();
}

export async function registerPaiement(
  commandeId: number,
  input: { ligne_ids: number[]; mode_paiement: string },
): Promise<CommandeDetail> {
  const res = await apiFetch(`/api/commandes/${commandeId}/paiement`, { method: "POST", body: input });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail ?? "Erreur lors de l'enregistrement du paiement");
  }
  return res.json();
}

/* ── Factures ── */
export type StatutFacture = "BROUILLON" | "EMISE" | "PAYEE" | "ANNULEE";

export interface Facture {
  id: number;
  code: string;
  client_id: number;
  commande_id: number | null;
  statut: StatutFacture;
  date_facture: string | null;
  date_echeance: string | null;
  montant_total: string | number;
  montant_paye: string | number;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export async function listFactures(params?: {
  statut?: StatutFacture;
  client_id?: number;
  page?: number;
  page_size?: number;
}): Promise<Page<Facture>> {
  const qs = new URLSearchParams();
  if (params?.statut) qs.set("statut", params.statut);
  if (params?.client_id) qs.set("client_id", String(params.client_id));
  if (params?.page) qs.set("page", String(params.page));
  if (params?.page_size) qs.set("page_size", String(params.page_size));
  const res = await apiFetch(`/api/factures?${qs}`);
  if (!res.ok) throw new Error("Erreur lors du chargement des factures");
  return res.json();
}

/* ── Paramètres (table générique : cle / nom / description / valeur JSON) ── */
export interface Parametre<V = Record<string, unknown>> {
  id: number;
  cle: string;
  nom: string;
  description: string | null;
  valeur: V;
}

/* Valeur JSON du paramètre "devise" */
export interface DeviseEntry {
  code: string;
  libelle: string | null;
  taux: number | string;
}

export interface DeviseValeur {
  devise_base: string;
  devises: DeviseEntry[];
}

export async function listParametres(): Promise<Parametre[]> {
  const res = await apiFetch("/api/parametres");
  if (!res.ok) throw new Error("Erreur lors du chargement des paramètres");
  return res.json();
}

export async function getParametre<V = Record<string, unknown>>(cle: string): Promise<Parametre<V>> {
  const res = await apiFetch(`/api/parametres/${cle}`);
  if (!res.ok) throw new Error("Paramètre introuvable");
  return res.json();
}

export async function updateParametre<V = Record<string, unknown>>(
  cle: string,
  valeur: V,
): Promise<Parametre<V>> {
  const res = await apiFetch(`/api/parametres/${cle}`, { method: "PUT", body: { valeur } });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail ?? "Erreur lors de la mise à jour du paramètre");
  }
  return res.json();
}

/* ── Config de facturation (lecture seule, accessible à toute l'app) ── */
export interface FacturationConfig {
  devise_base: string;
  devises: DeviseEntry[];
  tva_taux_defaut: number | string | null;
}

export async function getFacturationConfig(): Promise<FacturationConfig> {
  const res = await apiFetch("/api/facturation/config");
  if (!res.ok) throw new Error("Erreur lors du chargement de la configuration de facturation");
  return res.json();
}

export async function logout(): Promise<void> {
  await apiFetch("/api/auth/logout", { method: "POST" });
}
