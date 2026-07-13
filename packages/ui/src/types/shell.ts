import { ReactNode } from "react";

export interface NavItem {
  label: string;
  href: string;
  icon: ReactNode;
  badge?: number;
  exact?: boolean;
  // Quand défini, l'entrée n'est rendue que si la session détient cette permission.
  // Le filtrage est fait par l'app (le Sidebar reste agnostique de @repo/auth).
  permission?: string;
}

export interface AppDefinition {
  id: string;
  name: string;
  icon: string | ReactNode;
  url: string;
  color?: string;
  description?: string;
}

export interface UserSummary {
  id: number;
  username: string;
  email: string;
  avatarUrl?: string;
}
