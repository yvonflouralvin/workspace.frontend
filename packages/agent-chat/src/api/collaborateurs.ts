import { apiFetch } from "@repo/network/client";
import type { Collaborateur, Mission, RoleCollaborateur } from "../types";
import { BASE_PAR_DEFAUT, ErreurAssistant } from "./client";

async function json<T>(reponse: Response): Promise<T> {
  const charge = await reponse.json().catch(() => null);
  if (!reponse.ok) {
    throw new ErreurAssistant(
      (charge as { detail?: string } | null)?.detail ?? "Le service assistant n'a pas répondu",
      reponse.status
    );
  }
  return charge as T;
}

export async function listerRoles(base = BASE_PAR_DEFAUT): Promise<RoleCollaborateur[]> {
  return json(await apiFetch(`${base}/collaborateurs/roles`));
}

export async function listerCollaborateurs(base = BASE_PAR_DEFAUT): Promise<Collaborateur[]> {
  return json(await apiFetch(`${base}/collaborateurs`));
}

export interface NouveauCollaborateur {
  cle: string;
  nom: string;
  role: string;
  consigne: string;
  cadence: string;
  heure: number;
  jour: number | null;
  group_ids: number[];
}

export async function creerCollaborateur(
  corps: NouveauCollaborateur,
  base = BASE_PAR_DEFAUT
): Promise<Collaborateur> {
  return json(await apiFetch(`${base}/collaborateurs`, { method: "POST", body: corps }));
}

export async function modifierCollaborateur(
  id: number,
  corps: Partial<NouveauCollaborateur> & { actif?: boolean },
  base = BASE_PAR_DEFAUT
): Promise<Collaborateur> {
  return json(
    await apiFetch(`${base}/collaborateurs/${id}`, { method: "PATCH", body: corps })
  );
}

export async function listerMissions(
  collaborateurId: number,
  base = BASE_PAR_DEFAUT
): Promise<Mission[]> {
  return json(await apiFetch(`${base}/collaborateurs/${collaborateurId}/missions`));
}

export async function lancerMission(
  collaborateurId: number,
  base = BASE_PAR_DEFAUT
): Promise<Mission> {
  return json(
    await apiFetch(`${base}/collaborateurs/${collaborateurId}/missions`, { method: "POST", body: {} })
  );
}

export async function lireMission(id: number, base = BASE_PAR_DEFAUT): Promise<Mission> {
  return json(await apiFetch(`${base}/collaborateurs/missions/${id}`));
}
