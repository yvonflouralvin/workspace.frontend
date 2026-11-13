"use client";

import { apiFetch } from "@repo/network/client";

export interface Membre {
  id: number;
  name: string;
}

// L'API renvoie `{members: [{id, user: {id, username}}]}` ; on tolère aussi une
// liste nue ou `items`, comme le module Projets de Workspace.
export async function listMembresWorkspace(workspaceId: number): Promise<Membre[]> {
  const res = await apiFetch(`/api/workspaces/${workspaceId}/members`);
  if (!res.ok) return [];
  const payload = await res.json();
  const rows: Record<string, unknown>[] = Array.isArray(payload)
    ? payload
    : ((payload?.members ?? payload?.items ?? []) as Record<string, unknown>[]);
  return rows
    .map((m) => {
      const user = (m.user ?? {}) as Record<string, unknown>;
      const id = Number(user.id ?? m.user_id ?? m.id);
      return { id, name: String(user.username ?? m.username ?? m.name ?? user.email ?? `#${id}`) };
    })
    .filter((m) => Number.isFinite(m.id));
}

export interface GroupeWorkspace {
  id: number;
  name: string;
}

/** Les groupes du workspace, pour partager une fiche avec un groupe plutôt
 *  qu'avec des personnes une par une. Même tolérance de forme que ci-dessus. */
export async function listGroupesWorkspace(workspaceId: number): Promise<GroupeWorkspace[]> {
  const res = await apiFetch(`/api/workspaces/${workspaceId}/groups`);
  if (!res.ok) return [];
  const payload = await res.json();
  const rows: Record<string, unknown>[] = Array.isArray(payload)
    ? payload
    : ((payload?.groups ?? payload?.items ?? []) as Record<string, unknown>[]);
  return rows
    .map((g) => ({ id: Number(g.id), name: String(g.name ?? `#${g.id}`) }))
    .filter((g) => Number.isFinite(g.id));
}
