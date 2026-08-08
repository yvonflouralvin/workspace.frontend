// packages/auth/types/session.ts

export interface Workspace {
  id: number;
  name: string;
  slug: string;
  permissions: string[];
}

export interface ActiveWorkspace {
  id: number;
  name: string;
  slug: string;
  type: "individual" | "organization";
  restrict_members_to_workspace: boolean;
  is_owner: boolean;
}

export interface User {
  id: number;
  email: string;
  username: string;
}

export interface SessionGroup {
  id: number;
  name: string;
}

export interface SessionResponse {
  authenticated: boolean;

  user: User | null;

  active_workspace: ActiveWorkspace | null;

  workspaces: Workspace[];

  groups: SessionGroup[];
  /** Écran d'accueil résolu depuis les groupes du membre. Absent = défaut. */
  accueil?: {
    landing_app_key: string | null;
    accueil_personnalise: boolean;
    liens_rapides: {
      id?: number;
      libelle: string;
      description: string | null;
      app_key: string;
      chemin: string | null;
      icone: string | null;
      position: number;
    }[];
    groupe: { id: number; name: string } | null;
  };

  permissions: string[];
}