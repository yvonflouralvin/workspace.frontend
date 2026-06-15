// packages/auth/types/session.ts

export interface Workspace {    
  id: number;
  name: string;
  slug: string;
}

export interface User {
  id: number;
  email: string;
  username: string;
}

export interface SessionResponse {
  authenticated: boolean;

  user: User | null;

  active_workspace: Workspace | null;

  workspaces: Workspace[];

  roles: string[];

  permissions: string[];
}