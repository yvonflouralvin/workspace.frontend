// packages/auth/store/session.store.ts

import { createStore, useStore, type StoreApi } from "zustand";
import { createContext, useContext } from "react";
import { getSession } from "../api/session.js";
import {User,Workspace,SessionResponse,} from "../types/session.js";

export interface SessionState {
  loading: boolean;
  authenticated: boolean;
  user: User | null;
  activeWorkspace: Workspace | null;
  workspaces: Workspace[];
  roles: string[];
  permissions: string[];

  hydrate: (session: SessionResponse) => void;
  loadSession: () => Promise<void>;
  logout: () => void;
}

export function createSessionStore(initialSession?: SessionResponse) {
  return createStore<SessionState>((set) => ({
    loading: !initialSession,
    authenticated: initialSession?.authenticated ?? false,
    user: initialSession?.user ?? null,
    activeWorkspace: initialSession?.active_workspace ?? null,
    workspaces: initialSession?.workspaces ?? [],
    roles: initialSession?.roles ?? [],
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
        roles: session.roles,
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
          roles: session.roles,
          permissions: session.permissions,
        });

      } catch {
        set({
          loading: false,
          authenticated: false,
        });
      }
    },

    logout() {
      set({
        authenticated: false,
        user: null,
        activeWorkspace: null,
        workspaces: [],
        roles: [],
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