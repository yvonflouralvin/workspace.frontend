"use client";

import { useSessionStore } from "@repo/auth/store/session.store";
import { usePermissions } from "@repo/auth/hooks/usePermissions";
import { apiFetch } from "@repo/network/client";
import { AppShell } from "@repo/ui/shell/AppShell";
import { Sidebar } from "@repo/ui/shell/Sidebar";
import { TopBar } from "@repo/ui/shell/TopBar";
import { UserFooter } from "@repo/ui/shell/UserFooter";
import { WorkspaceSwitcher } from "@repo/ui/WorkspaceSwitcher";
import {
  HomeOutlined,
  FolderOpenOutlined,
  GroupOutlined,
  InboxOutlined,
  SettingsOutlined,
  HelpOutlineOutlined,
} from "@mui/icons-material";
import type { NavItem, AppDefinition } from "@repo/ui/types/shell";

const NAV_ITEMS: NavItem[] = [
  { label: "Accueil",  href: "/",         icon: <HomeOutlined style={{ fontSize: 20 }} />,        exact: true },
  { label: "Projets",  href: "/projects",  icon: <FolderOpenOutlined style={{ fontSize: 20 }} /> },
  { label: "Membres",  href: "/members",   icon: <GroupOutlined style={{ fontSize: 20 }} /> },
  { label: "Inbox",    href: "/inbox",     icon: <InboxOutlined style={{ fontSize: 20 }} /> },
];

const SECONDARY_ITEMS: NavItem[] = [
  { label: "Paramètres", href: "/settings", icon: <SettingsOutlined style={{ fontSize: 20 }} /> },
  { label: "Aide",       href: "/help",     icon: <HelpOutlineOutlined style={{ fontSize: 20 }} /> },
];

const APPS: AppDefinition[] = [
  {
    id: "workspace",
    name: "Workspace",
    icon: "W",
    url: process.env.NEXT_PUBLIC_AUTH_API_AUTH_DOMAIN ?? "http://localhost:3005",
    color: "#3525cd",
    description: "Tableau de bord principal",
  },
  {
    id: "hr",
    name: "RH",
    icon: "H",
    url: process.env.NEXT_PUBLIC_AUTH_API_HR_DOMAIN ?? "http://localhost:3003",
    color: "#006c49",
    description: "Ressources humaines",
  },
  {
    id: "approval_flows",
    name: "Workflows d'approbation",
    icon: "A",
    url: process.env.NEXT_PUBLIC_AUTH_API_APPROVAL_FLOWS_DOMAIN ?? "http://localhost:3006",
    color: "#004598",
    description: "Création et gestion de workflows d'approbation",
  },
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
    await apiFetch("/api/logout", { method: "POST" });
    window.location.href = process.env.NEXT_PUBLIC_AUTH_API_AUTH_DOMAIN ?? "http://localhost:3001";
  }

  return (
    <AppShell
      sidebar={
        <Sidebar
          topSlot={<WorkspaceSwitcher />}
          navItems={NAV_ITEMS}
          secondaryItems={SECONDARY_ITEMS}
          bottomSlot={<UserFooter user={userSummary} onLogout={handleLogout} />}
        />
      }
      topBar={
        <TopBar
          apps={visibleApps}
          allAppsUrl="/apps"
          user={userSummary}
          preferencesUrl="/preferences"
          onLogout={handleLogout}
        />
      }
    >
      {children}
    </AppShell>
  );
}
