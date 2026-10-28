import { apiFetch } from "@repo/network/client";
import type { Fil, FilDetail, ListeFils, Personne, Resume } from "../types";

const BASE = "/api/inbox";

export class ErreurBoite extends Error {
  statut: number;
  constructor(message: string, statut: number) {
    super(message);
    this.statut = statut;
  }
}

async function lire(reponse: Response) {
  const data = await reponse.json().catch(() => ({}));
  if (!reponse.ok) {
    throw new ErreurBoite(
      data.detail ?? data.message ?? "Une erreur est survenue",
      reponse.status,
    );
  }
  return data;
}

export async function listerFils(
  params: { genre?: string; q?: string; non_lus?: boolean } = {},
  base = BASE,
): Promise<ListeFils> {
  const query = new URLSearchParams();
  if (params.genre) query.set("genre", params.genre);
  if (params.q) query.set("q", params.q);
  if (params.non_lus) query.set("non_lus", "true");
  const suffixe = query.toString() ? `?${query}` : "";
  return lire(await apiFetch(`${base}/fils${suffixe}`));
}

export async function lireFil(id: number, base = BASE): Promise<FilDetail> {
  return lire(await apiFetch(`${base}/fils/${id}`));
}

export async function creerFil(
  corps: { destinataires: number[]; contenu: string },
  base = BASE,
): Promise<FilDetail> {
  return lire(await apiFetch(`${base}/fils`, { method: "POST", body: corps }));
}

export async function repondre(
  id: number,
  contenu: string,
  base = BASE,
): Promise<FilDetail> {
  return lire(
    await apiFetch(`${base}/fils/${id}/messages`, { method: "POST", body: { contenu } }),
  );
}

export async function resume(base = BASE): Promise<Resume> {
  return lire(await apiFetch(`${base}/resume`));
}

export async function annuaire(base = BASE): Promise<Personne[]> {
  return lire(await apiFetch(`${base}/annuaire`));
}

export type { Fil, FilDetail, Personne, Resume };
