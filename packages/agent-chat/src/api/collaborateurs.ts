import { apiFetch } from "@repo/network/client";
import type {
  Collaborateur,
  GroupesAutorises,
  Mission,
  NiveauAcces,
  RoleCollaborateur,
  TacheRecurrente,
} from "../types";
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
  /** L'invite système : qui il est, comment il travaille. Pas ce qu'il a à
   *  faire — ça, ce sont ses tâches. */
  profil: string;
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
  corps: { nom?: string; profil?: string; actif?: boolean },
  base = BASE_PAR_DEFAUT
): Promise<Collaborateur> {
  return json(
    await apiFetch(`${base}/collaborateurs/${id}`, { method: "PATCH", body: corps })
  );
}

// ─── les tâches récurrentes ──────────────────────────────────────────────────

export interface NouvelleTache {
  nom: string;
  consigne: string;
  cadence: string;
  heure: number;
  jour: number | null;
  actif?: boolean;
}

export async function listerTaches(
  collaborateurId: number,
  base = BASE_PAR_DEFAUT
): Promise<TacheRecurrente[]> {
  return json(await apiFetch(`${base}/collaborateurs/${collaborateurId}/taches`));
}

export async function creerTache(
  collaborateurId: number,
  corps: NouvelleTache,
  base = BASE_PAR_DEFAUT
): Promise<TacheRecurrente> {
  return json(
    await apiFetch(`${base}/collaborateurs/${collaborateurId}/taches`, {
      method: "POST",
      body: corps,
    })
  );
}

export async function modifierTache(
  collaborateurId: number,
  tacheId: number,
  corps: Partial<NouvelleTache>,
  base = BASE_PAR_DEFAUT
): Promise<TacheRecurrente> {
  return json(
    await apiFetch(`${base}/collaborateurs/${collaborateurId}/taches/${tacheId}`, {
      method: "PATCH",
      body: corps,
    })
  );
}

export async function supprimerTache(
  collaborateurId: number,
  tacheId: number,
  base = BASE_PAR_DEFAUT
): Promise<void> {
  const reponse = await apiFetch(
    `${base}/collaborateurs/${collaborateurId}/taches/${tacheId}`,
    { method: "DELETE" }
  );
  if (!reponse.ok) {
    throw new ErreurAssistant("La tâche n'a pas pu être supprimée", reponse.status);
  }
}

// ─── les missions ────────────────────────────────────────────────────────────

export async function listerMissions(
  collaborateurId: number,
  base = BASE_PAR_DEFAUT
): Promise<Mission[]> {
  return json(await apiFetch(`${base}/collaborateurs/${collaborateurId}/missions`));
}

/** Faire travailler le collaborateur tout de suite : sur une de ses tâches,
 *  ou sur un texte écrit pour l'occasion. */
export async function lancerMission(
  collaborateurId: number,
  corps: { tache_id?: number; invite?: string },
  base = BASE_PAR_DEFAUT
): Promise<Mission> {
  return json(
    await apiFetch(`${base}/collaborateurs/${collaborateurId}/missions`, {
      method: "POST",
      body: corps,
    })
  );
}

export async function lireMission(id: number, base = BASE_PAR_DEFAUT): Promise<Mission> {
  return json(await apiFetch(`${base}/collaborateurs/missions/${id}`));
}

// ─── qui a le droit de le faire travailler ───────────────────────────────────

export async function listerGroupesAutorises(
  collaborateurId: number,
  base = BASE_PAR_DEFAUT
): Promise<GroupesAutorises> {
  return json(await apiFetch(`${base}/collaborateurs/${collaborateurId}/groupes`));
}

/** Remplace la liste ENTIÈRE. L'écran envoie son état complet : traiter
 *  l'appel comme un ajout obligerait le serveur à deviner ce qui a été
 *  décoché. */
export async function reglerGroupesAutorises(
  collaborateurId: number,
  groupes: { group_id: number; niveau: NiveauAcces | null }[],
  base = BASE_PAR_DEFAUT
): Promise<GroupesAutorises> {
  return json(
    await apiFetch(`${base}/collaborateurs/${collaborateurId}/groupes`, {
      method: "PUT",
      body: { groupes },
    })
  );
}
