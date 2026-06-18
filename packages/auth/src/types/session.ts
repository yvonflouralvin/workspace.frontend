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

  permissions: string[];
}