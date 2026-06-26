"use client";

import { useState, useEffect } from "react";
import { useSessionStore } from "@repo/auth/store/session.store";
import { usePermissions } from "@repo/auth/hooks/usePermissions";
import { AppShell } from "@repo/ui/shell/AppShell";
import { Sidebar } from "@repo/ui/shell/Sidebar";
import { TopBar } from "@repo/ui/shell/TopBar";
import { UserFooter } from "@repo/ui/shell/UserFooter";
import { WorkspaceSwitcher } from "@repo/ui/WorkspaceSwitcher";
import { HomeOutlined, AccountTreeOutlined, AssignmentTurnedInOutlined, OutboxOutlined } from "@mui/icons-material";
import type { NavItem, AppDefinition } from "@repo/ui/types/shell";
import { getPublicConfig } from "@repo/network/client";
import { logout as logoutRequest } from "@/app/lib/api";

const NAV_ITEMS: NavItem[] = [
  { label: "MyRequest", href: "/", icon: <HomeOutlined style={{ fontSize: 20 }} />, exact: true },
  { label: "Requests", href: "/requests", icon: <AssignmentTurnedInOutlined style={{ fontSize: 20 }} /> },
  { label: "Flows", href: "/flows", icon: <AccountTreeOutlined style={{ fontSize: 20 }} /> },
  { label: "Submission", href: "/submissions", icon: <OutboxOutlined style={{ fontSize: 20 }} /> },
];

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const { user, logout } = useSessionStore();
  const { can } = usePermissions();
  const [apps, setApps] = useState<AppDefinition[]>([]);

  useEffect(() => {
    getPublicConfig().then((cfg) => {
      setApps([
        { id: "workspace", name: "Workspace", icon: "W", url: cfg.workspaceDomain ?? "http://localhost:3005", color: "#3525cd", description: "Tableau de bord principal" },
        { id: "approval_flows", name: "Workflows d'approbation", icon: "A", url: "http://localhost:3006", color: "#004598", description: "Création et gestion de workflows d'approbation" },
        { id: "hr", name: "RH", icon: "H", url: cfg.hrDomain ?? "http://localhost:3003", color: "#006c49", description: "Ressources humaines" },
      ]);
    });
  }, []);

  const userSummary = user
    ? { id: user.id, username: user.username, email: user.email }
    : null;

  const visibleApps = apps.filter((app) => can(`${app.id}.access`));

  async function handleLogout() {
    logout();
    await logoutRequest();
    const { authDomain } = await getPublicConfig();
    window.location.href = authDomain ?? "http://localhost:3001";
  }

  return (
    <AppShell
      sidebar={
        <Sidebar
          topSlot={<WorkspaceSwitcher filterPermission="approval_flows.access" />}
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
        />
      }
    >
      {children}
    </AppShell>
  );
}
