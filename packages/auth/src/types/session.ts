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
  /** Clés des apps réellement activées pour ce workspace (boutique) — à
   *  croiser avec les permissions pour le sélecteur d'apps : une permission
   *  `.access` ne suffit pas, l'app doit aussi être active. */
  apps_actifs: string[];
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
  /** Configuration que le NAVIGATEUR ne peut pas lire lui-même : une variable
   *  `NEXT_PUBLIC_*` est figée dans le bundle à la compilation, donc absente
   *  d'une image construite une fois pour tous les clients.
   *
   *  N'arrive PAS du backend `auth` : posée par `getServerSession`, côté
   *  serveur de l'app, depuis l'environnement de son propre conteneur. Elle
   *  voyage avec la session parce que c'est la seule charge que les 17 apps
   *  chargent déjà à la racine — et qu'une copie par layout serait une
   *  occasion de divergence par app. */
  config_reseau?: { mode?: string; cle?: string };

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

  /** Réglages de l'INSTANCE elle-même, pas d'un workspace — distinct de
   *  `active_workspace.restrict_members_to_workspace`, qui ne vaut que pour un seul. */
  platform?: {
    /** Une instance dédiée à un client n'en a qu'un : personne, pas même le
     *  propriétaire, n'y voit la fonctionnalité "créer un autre workspace". */
    workspace_creation_disabled: boolean;
  };
}