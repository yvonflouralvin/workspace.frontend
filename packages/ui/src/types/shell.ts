import { ReactNode } from "react";

export interface NavItem {
  label: string;
  href: string;
  icon: ReactNode;
  badge?: number;
  exact?: boolean;
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
