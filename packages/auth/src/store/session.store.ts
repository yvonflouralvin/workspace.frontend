// packages/auth/store/session.store.ts

import { create } from "zustand";
import { getSession } from "../api/session.js";
import {User,Workspace,SessionGroup,} from "../types/session.js";

interface SessionState {
  loading: boolean;
  authenticated: boolean;
  user: User | null;
  activeWorkspace: Workspace | null;
  workspaces: Workspace[];
  groups: SessionGroup[];
  permissions: string[];

  loadSession: () => Promise<void>;
  switchWorkspace: (workspaceId: number) => Promise<void>;
  logout: () => void;
}

const AUTH_API = process.env.NEXT_PUBLIC_AUTH_API;

export const useSessionStore =
  create<SessionState>((set, get) => ({
    loading: true,
    authenticated: false,
    user: null,
    activeWorkspace: null,
    workspaces: [],
    groups: [],
    permissions: [],
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
      await fetch(`${AUTH_API}/auth/switch-workspace`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workspace_id: workspaceId }),
      });
      window.location.reload();
    },

    logout() {
      set({
        authenticated: false,
        user: null,
        activeWorkspace: null,
        workspaces: [],
        groups: [],
        permissions: [],
      });
    },
  }));