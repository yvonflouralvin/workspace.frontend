// packages/auth/store/session.store.ts

import { createStore, useStore, type StoreApi } from "zustand";
import { createContext, useContext } from "react";
import { apiFetch } from "@repo/network/client";
import { getSession } from "../api/session.js";
import {User,Workspace,ActiveWorkspace,SessionGroup,SessionResponse,} from "../types/session.js";

export interface SessionState {
  loading: boolean;
  authenticated: boolean;
  user: User | null;
  activeWorkspace: ActiveWorkspace | null;
  workspaces: Workspace[];
  groups: SessionGroup[];
  /** Écran d'accueil résolu depuis les groupes. Absent = comportement par défaut. */
  accueil?: SessionResponse["accueil"];
  permissions: string[];

  hydrate: (session: SessionResponse) => void;
  loadSession: () => Promise<void>;
  switchWorkspace: (workspaceId: number) => Promise<void>;
  logout: () => void;
}

export function createSessionStore(initialSession?: SessionResponse) {
  return createStore<SessionState>((set) => ({
    loading: !initialSession,
    authenticated: initialSession?.authenticated ?? false,
    user: initialSession?.user ?? null,
    activeWorkspace: initialSession?.active_workspace ?? null,
    workspaces: initialSession?.workspaces ?? [],
    groups: initialSession?.groups ?? [],
    accueil: initialSession?.accueil,
    permissions: initialSession?.permissions ?? [],
    hydrate(session: SessionResponse) {
      if (!session.authenticated) {
        set({ loading: false, authenticated: false });
        return;
      }

      set({
        loading: false,
        authenticated: true,
        user: session.user,
        activeWorkspace: session.active_workspace,
        workspaces: session.workspaces,
        groups: session.groups,
        accueil: session.accueil,
        permissions: session.permissions,
      });
    },
    async loadSession() {
      try {
        const session =
          await getSession();
        if (
          !session.authenticated
        ) {
          set({
            loading: false,
            authenticated: false,
          });
          return;
        }

        set({
          loading: false,
          authenticated: true,
          user: session.user,
          activeWorkspace: session.active_workspace,
          workspaces: session.workspaces,
          groups: session.groups,
        accueil: session.accueil,
          permissions: session.permissions,
        });

      } catch {
        set({
          loading: false,
          authenticated: false,
        });
      }
    },

    async switchWorkspace(workspaceId: number) {
      const response = await apiFetch(`/api/switch-workspace`, {
        method: "POST",
        body: { workspace_id: workspaceId },
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.message ?? "Impossible de changer de workspace.");
      }

      window.location.reload();
    },

    logout() {
      set({
        authenticated: false,
        user: null,
        activeWorkspace: null,
        workspaces: [],
        groups: [],
        accueil: undefined,
        permissions: [],
      });
    },
  }));
}

export type SessionStoreApi = StoreApi<SessionState>;

export const SessionStoreContext = createContext<SessionStoreApi | null>(null);

function identity<T>(state: T): T {
  return state;
}

export function useSessionStore<U = SessionState>(
  selector: (state: SessionState) => U = identity as (state: SessionState) => U
): U {
  const store = useContext(SessionStoreContext);
  if (!store) {
    throw new Error("useSessionStore must be used within a SessionProvider");
  }
  return useStore(store, selector);
}