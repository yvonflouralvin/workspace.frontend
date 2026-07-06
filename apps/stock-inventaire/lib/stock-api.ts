"use client";

import { apiFetch } from "@repo/network/client";

export type TypeItem = "PRODUIT" | "MATERIEL" | "SERVICE" | "PRESTATION" | "TELECHARGEABLE";
export type TypeMouvement = "ENTREE" | "SORTIE" | "AJUSTEMENT";

export const TYPE_ITEM_LABELS: Record<TypeItem, string> = {
  PRODUIT: "Produit",
  MATERIEL: "Matériel",
  SERVICE: "Service",
  PRESTATION: "Prestation",
  TELECHARGEABLE: "Téléchargeable",
};

export const TYPE_MOUVEMENT_LABELS: Record<TypeMouvement, string> = {
  ENTREE: "Entrée",
  SORTIE: "Sortie",
  AJUSTEMENT: "Ajustement",
};

export const UNITES = [
  { value: "pcs", label: "Pièce (pcs)" },
  { value: "kg", label: "Kilogramme (kg)" },
  { value: "g", label: "Gramme (g)" },
  { value: "L", label: "Litre (L)" },
  { value: "mL", label: "Millilitre (mL)" },
  { value: "m", label: "Mètre (m)" },
  { value: "m²", label: "Mètre carré (m²)" },
  { value: "m³", label: "Mètre cube (m³)" },
  { value: "h", label: "Heure (h)" },
  { value: "jour", label: "Jour" },
  { value: "lot", label: "Lot" },
  { value: "forfait", label: "Forfait" },
];

export interface CategorieSummary {
  id: number;
  nom: string;
  is_active: boolean;
}

export interface CategorieDetail extends CategorieSummary {
  workspace_id: number;
  description: string | null;
  created_at: string;
}

export interface ItemSummary {
  id: number;
  code: string;
  type: TypeItem;
  categorie_id: number | null;
  categorie_nom: string | null;
  nom: string;
  reference: string | null;
  unite: string;
  gestion_stock: boolean;
  stock_actuel: number;
  stock_minimum: number | null;
  est_vendu: boolean;
  prix_vente: number | null;
  is_active: boolean;
}

export interface ItemDetail extends ItemSummary {
  workspace_id: number;
  description: string | null;
  tva_taux: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface ItemPage {
  items: ItemSummary[];
  total: number;
  page: number;
  pages: number;
}

export interface ItemCreateInput {
  type: TypeItem;
  categorie_id?: number | null;
  nom: string;
  description?: string;
  reference?: string;
  unite: string;
  gestion_stock: boolean;
  stock_actuel?: number;
  stock_minimum?: number | null;
  est_vendu: boolean;
  prix_vente?: number | null;
  tva_taux?: number | null;
  notes?: string;
}

export type ItemUpdateInput = Partial<ItemCreateInput & { is_active: boolean }>;

export interface MouvementOut {
  id: number;
  item_id: number;
  type_mouvement: TypeMouvement;
  quantite: number;
  stock_avant: number;
  stock_apres: number;
  reference: string | null;
  notes: string | null;
  created_at: string;
}

export interface MouvementCreateInput {
  type_mouvement: TypeMouvement;
  quantite: number;
  reference?: string;
  notes?: string;
}

// ── Categories ──

export async function listCategories(actif?: boolean): Promise<CategorieDetail[]> {
  const qs = actif !== undefined ? `?actif=${actif}` : "";
  const res = await apiFetch(`/api/categories${qs}`);
  if (!res.ok) throw new Error("Erreur lors du chargement des catégories");
  return res.json();
}

export async function createCategorie(input: { nom: string; description?: string }): Promise<CategorieDetail> {
  const res = await apiFetch("/api/categories", { method: "POST", body: input });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail ?? "Erreur lors de la création");
  }
  return res.json();
}

export async function updateCategorie(id: number, input: Partial<{ nom: string; description: string; is_active: boolean }>): Promise<CategorieDetail> {
  const res = await apiFetch(`/api/categories/${id}`, { method: "PUT", body: input });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail ?? "Erreur lors de la mise à jour");
  }
  return res.json();
}

export async function deleteCategorie(id: number): Promise<void> {
  const res = await apiFetch(`/api/categories/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error("Erreur lors de la désactivation");
}

// ── Items ──

export async function listItems(params?: {
  q?: string;
  type?: TypeItem;
  categorie_id?: number;
  est_vendu?: boolean;
  gestion_stock?: boolean;
  actif?: boolean;
  page?: number;
  page_size?: number;
}): Promise<ItemPage> {
  const qs = new URLSearchParams();
  if (params?.q) qs.set("q", params.q);
  if (params?.type) qs.set("type", params.type);
  if (params?.categorie_id != null) qs.set("categorie_id", String(params.categorie_id));
  if (params?.est_vendu !== undefined) qs.set("est_vendu", String(params.est_vendu));
  if (params?.gestion_stock !== undefined) qs.set("gestion_stock", String(params.gestion_stock));
  if (params?.actif !== undefined) qs.set("actif", String(params.actif));
  if (params?.page) qs.set("page", String(params.page));
  if (params?.page_size) qs.set("page_size", String(params.page_size));
  const res = await apiFetch(`/api/items?${qs}`);
  if (!res.ok) throw new Error("Erreur lors du chargement des articles");
  return res.json();
}

export async function getItem(id: number): Promise<ItemDetail> {
  const res = await apiFetch(`/api/items/${id}`);
  if (!res.ok) throw new Error("Article introuvable");
  return res.json();
}

export async function createItem(input: ItemCreateInput): Promise<ItemDetail> {
  const res = await apiFetch("/api/items", { method: "POST", body: input });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail ?? "Erreur lors de la création");
  }
  return res.json();
}

export async function updateItem(id: number, input: ItemUpdateInput): Promise<ItemDetail> {
  const res = await apiFetch(`/api/items/${id}`, { method: "PUT", body: input });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail ?? "Erreur lors de la mise à jour");
  }
  return res.json();
}

export async function deactivateItem(id: number): Promise<void> {
  const res = await apiFetch(`/api/items/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error("Erreur lors de la désactivation");
}

// ── Mouvements ──

export async function listMouvements(itemId: number, limit?: number): Promise<MouvementOut[]> {
  const qs = limit ? `?limit=${limit}` : "";
  const res = await apiFetch(`/api/mouvements/${itemId}${qs}`);
  if (!res.ok) throw new Error("Erreur lors du chargement des mouvements");
  return res.json();
}

export async function createMouvement(itemId: number, input: MouvementCreateInput): Promise<MouvementOut> {
  const res = await apiFetch(`/api/mouvements/${itemId}`, { method: "POST", body: input });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail ?? "Erreur lors de l'enregistrement du mouvement");
  }
  return res.json();
}

export async function logout(): Promise<void> {
  await apiFetch("/api/auth/logout", { method: "POST" });
}
