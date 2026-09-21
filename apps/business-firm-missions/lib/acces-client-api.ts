"use client";

import { apiFetch } from "@repo/network/client";
import { lire } from "./http";

export interface AccesClient {
  id: number;
  user_id: number;
  tiers_id: number;
  tiers_nom: string;
  contact_id: number | null;
  email: string;
  nom: string;
  actif: boolean;
  created_at: string;
}

export interface AccesCree {
  acces: AccesClient;
  /** Rendu UNE SEULE FOIS, à la création : il n'est stocké nulle part en clair. */
  mot_de_passe_initial: string | null;
  /** La personne avait déjà un compte : son mot de passe n'a pas été touché. */
  compte_existant: boolean;
}

export async function listAccesClient(tiersId: number): Promise<AccesClient[]> {
  const res = await apiFetch(`/api/bfm/acces-client?tiers_id=${tiersId}`);
  if (!res.ok) return [];
  return res.json();
}

export async function donnerAcces(input: {
  tiers_id: number;
  tiers_nom: string;
  contact_id: number | null;
  email: string;
  nom: string;
}): Promise<AccesCree> {
  return lire<AccesCree>(await apiFetch("/api/bfm/acces-client", { method: "POST", body: input }));
}

export async function reinitialiserMotDePasse(accesId: number): Promise<string> {
  const r = await lire<{ mot_de_passe: string }>(
    await apiFetch(`/api/bfm/acces-client/${accesId}/mot-de-passe`, { method: "POST", body: {} }),
  );
  return r.mot_de_passe;
}

export async function retirerAcces(accesId: number): Promise<void> {
  await lire<void>(await apiFetch(`/api/bfm/acces-client/${accesId}`, { method: "DELETE" }));
}
