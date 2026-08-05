import { apiFetch } from "@repo/network/client";

/** Le catalogue d'applications, vu d'un workspace ou de la plateforme. */

export interface AppEntree {
  id: number;
  uuid: string;
  key: string;
  name: string;
  description: string | null;
  visibilite: "VISIBLE" | "UUID";
  mode_activation: "GRATUIT" | "SOUSCRIPTION" | "ACHAT_UNIQUE";
  prix: number | null;
  devise: string | null;
  est_systeme: boolean;
  activee: boolean;
  statut: string | null;
  source: string | null;
  expire_le: string | null;
  expiree: boolean;
  motif_suspension: string | null;
}

export interface AppPlateforme extends Omit<AppEntree, "activee" | "statut" | "source" | "expire_le" | "expiree" | "motif_suspension"> {
  periode_jours: number | null;
  workspaces_actifs: number;
}

export interface WorkspacePlateforme {
  id: number;
  name: string;
  type: string | null;
  owner_id: number | null;
  membres: number;
  apps_actives: number;
  cree_le: string | null;
}

export interface Apercu {
  comptes: number;
  workspaces: number;
  applications: number;
  activations: number;
  abonnements_actifs: number;
  codes_non_utilises: number;
  sessions_actives: number;
}

export interface CodeActivation {
  id: number;
  code: string;
  app_id: number;
  workspace_id: number | null;
  type_abonnement: string;
  duree_jours: number | null;
  usages: number;
  usages_max: number;
  expire_le: string | null;
}

export interface Abonnement {
  id: number;
  workspace_id: number;
  app_id: number;
  type: string;
  statut: string;
  debut_le: string | null;
  fin_le: string | null;
  montant: number | null;
  devise: string | null;
}

export const MODE_LABELS: Record<string, string> = {
  GRATUIT: "Gratuite",
  SOUSCRIPTION: "Souscription",
  ACHAT_UNIQUE: "Achat unique",
};

export const VISIBILITE_LABELS: Record<string, string> = {
  VISIBLE: "Visible dans la boutique",
  UUID: "Cachée — trouvable par son identifiant",
};

async function lire<T>(r: Response): Promise<T> {
  if (!r.ok) {
    const corps = await r.json().catch(() => ({}));
    throw new Error(typeof corps?.message === "string" ? corps.message : `Erreur ${r.status}`);
  }
  if (r.status === 204) return undefined as T;
  return (await r.json()) as T;
}

export const appsApi = {
  duWorkspace: (workspaceId: number) =>
    apiFetch(`/api/workspaces/${workspaceId}/apps`).then((r) => lire<AppEntree[]>(r)),
  boutique: (workspaceId: number, q?: string) =>
    apiFetch(
      `/api/workspaces/${workspaceId}/apps/boutique${q ? `?q=${encodeURIComponent(q)}` : ""}`
    ).then((r) => lire<AppEntree[]>(r)),
  activer: (workspaceId: number, appId: number, code?: string) =>
    apiFetch(`/api/workspaces/${workspaceId}/apps/${appId}?action=activer`, {
      method: "POST",
      body: code ? { code } : {},
    }).then((r) => lire<AppEntree[]>(r)),
  desactiver: (workspaceId: number, appId: number) =>
    apiFetch(`/api/workspaces/${workspaceId}/apps/${appId}?action=desactiver`, {
      method: "POST",
      body: {},
    }).then((r) => lire<AppEntree[]>(r)),

  // ── Pilotage de la plateforme ──────────────────────────────────────────
  apercu: () => apiFetch("/api/platform/apercu").then((r) => lire<Apercu>(r)),
  workspaces: () =>
    apiFetch("/api/platform/workspaces").then((r) => lire<WorkspacePlateforme[]>(r)),
  appsPlateforme: () =>
    apiFetch("/api/platform/apps").then((r) => lire<AppPlateforme[]>(r)),
  reglerApp: (appId: number, corps: Partial<AppPlateforme>) =>
    apiFetch(`/api/platform/apps?id=${appId}`, { method: "PATCH", body: corps }).then((r) =>
      lire<unknown>(r)
    ),
  codes: () => apiFetch("/api/platform/codes").then((r) => lire<CodeActivation[]>(r)),
  creerCode: (corps: {
    app_id: number;
    workspace_id?: number | null;
    type_abonnement: string;
    duree_jours?: number | null;
    usages_max?: number;
    expire_dans_jours?: number | null;
  }) =>
    apiFetch("/api/platform/codes", { method: "POST", body: corps }).then((r) =>
      lire<{ id: number; code: string }>(r)
    ),
  abonnements: () =>
    apiFetch("/api/platform/abonnements").then((r) => lire<Abonnement[]>(r)),
};
