"use client";

import { useSessionStore } from "@repo/auth/store/session.store";
import { usePermissions } from "@repo/auth/hooks/usePermissions";
import { apiFetch } from "@repo/network/client";
import { AppShell } from "@repo/ui/shell/AppShell";
import { Sidebar } from "@repo/ui/shell/Sidebar";
import { TopBar } from "@repo/ui/shell/TopBar";
import type { SearchSection } from "@repo/ui/shell/TopBar";
import { UserFooter } from "@repo/ui/shell/UserFooter";
import { WorkspaceSwitcher } from "@repo/ui/WorkspaceSwitcher";
import { HomeOutlined, PeopleAltOutlined, FolderOutlined, FactCheckOutlined } from "@mui/icons-material";
import type { NavItem, AppDefinition } from "@repo/ui/types/shell";
import { logout as logoutRequest } from "@/app/lib/api";

const NAV_ITEMS: NavItem[] = [
  { label: "Accueil", href: process.env.NEXT_PUBLIC_WORKSPACE_DOMAIN ?? "http://localhost:3005", icon: <HomeOutlined style={{ fontSize: 20 }} />, exact: true },
  { label: "Employés", href: "/employees", icon: <PeopleAltOutlined style={{ fontSize: 20 }} /> },
  { label: "Groupes/Départements", href: "/groups", icon: <FolderOutlined style={{ fontSize: 20 }} /> },
  { label: "Démo approbation", href: "/demo-approval", icon: <FactCheckOutlined style={{ fontSize: 20 }} /> },
];

const APPS: AppDefinition[] = [
  { id: "workspace", name: "Workspace", icon: "W", url: process.env.NEXT_PUBLIC_WORKSPACE_DOMAIN ?? "http://localhost:3005", color: "#3525cd", description: "Tableau de bord principal" },
  { id: "hr", name: "RH", icon: "H", url: "http://localhost:3003", color: "#006c49", description: "Ressources humaines" },
  { id: "approval_flows", name: "Workflows d'approbation", icon: "A", url: process.env.NEXT_PUBLIC_AUTH_API_APPROVAL_FLOWS_DOMAIN ?? "http://localhost:3006", color: "#004598", description: "Création et gestion de workflows d'approbation" },
];

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const { user, logout } = useSessionStore();
  const { can } = usePermissions();

  const userSummary = user
    ? { id: user.id, username: user.username, email: user.email }
    : null;

  const visibleApps = APPS.filter((app) => can(`${app.id}.access`));

  async function handleLogout() {
    logout();
    await logoutRequest();
    window.location.href = process.env.NEXT_PUBLIC_AUTH_API_AUTH_DOMAIN ?? "http://localhost:3001";
  }

  async function handleSearch(q: string): Promise<SearchSection[]> {
    try {
      const res = await apiFetch(`/api/search?q=${encodeURIComponent(q)}`);
      if (!res.ok) return [];
      return res.json();
    } catch {
      return [];
    }
  }

  return (
    <AppShell
      sidebar={
        <Sidebar
          topSlot={<WorkspaceSwitcher filterPermission="hr.access" />}
          navItems={NAV_ITEMS}
          bottomSlot={<UserFooter user={userSummary} onLogout={handleLogout} />}
        />
      }
      topBar={
        <TopBar
          apps={visibleApps}
          allAppsUrl="/"
          user={userSummary}
          preferencesUrl="/"
          onLogout={handleLogout}
          onSearch={handleSearch}
        />
      }
    >
      {children}
    </AppShell>
  );
}
