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

/** Ton du badge de type — tokens du design system. */
export const TYPE_TONES: Record<TypeTiers, string> = {
  CLIENT: "bg-role-admin-container text-role-admin",
  FOURNISSEUR: "bg-member-active-container text-member-active",
  LES_DEUX: "bg-role-owner-container text-role-owner",
};

export const CATEGORIE_LABELS: Record<CategorieTiers, string> = {
  ENTREPRISE: "Entreprise",
  PARTICULIER: "Particulier",
};

export interface TiersPage {
  items: TiersSummary[];
  total: number;
  page: number;
  pages: number;
}

export interface TiersCreateInput {
  type: TypeTiers;
  categorie: CategorieTiers;
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
  if (!res.ok) throw new Error("Erreur lors du chargement des tiers");
  return res.json();
}

export async function getTiers(id: number): Promise<TiersDetail> {
  const res = await apiFetch(`/api/tiers/${id}`);
  if (!res.ok) throw new Error("Tiers introuvable");
  return res.json();
}

export async function createTiers(input: TiersCreateInput): Promise<TiersDetail> {
  const res = await apiFetch("/api/tiers", { method: "POST", body: input });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail ?? "Erreur lors de la création");
  }
  return res.json();
}

export async function updateTiers(id: number, input: TiersUpdateInput): Promise<TiersDetail> {
  const res = await apiFetch(`/api/tiers/${id}`, { method: "PUT", body: input });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail ?? "Erreur lors de la mise à jour");
  }
  return res.json();
}

export async function deactivateTiers(id: number): Promise<void> {
  const res = await apiFetch(`/api/tiers/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error("Erreur lors de la désactivation");
}

export async function searchTiers(q: string, type?: TypeTiers): Promise<{ id: number; code: string; nom: string; type: TypeTiers }[]> {
  const qs = new URLSearchParams({ q });
  if (type) qs.set("type", type);
  const res = await apiFetch(`/api/tiers/search?${qs}`);
  if (!res.ok) return [];
  return res.json();
}

export async function logout(): Promise<void> {
  await apiFetch("/api/auth/logout", { method: "POST" });
}
