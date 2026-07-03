"use client";

import { AppShell } from "@repo/ui/shell/AppShell";
import { Sidebar } from "@repo/ui/shell/Sidebar";
import { TopBar } from "@repo/ui/shell/TopBar";
import { UserFooter } from "@repo/ui/shell/UserFooter";
import { WorkspaceSwitcher } from "@repo/ui/WorkspaceSwitcher";
import { DescriptionOutlined, HomeOutlined } from "@mui/icons-material";
import type { NavItem, AppDefinition, UserSummary } from "@repo/ui/types/shell";
import { apiFetch } from "@repo/network/client";
import { useSessionStore } from "@repo/auth/store/session.store";
import { useCallback } from "react";

const NAV_ITEMS: NavItem[] = [
  {
    label: "Accueil",
    href: process.env.NEXT_PUBLIC_WORKSPACE_DOMAIN ?? "http://localhost:3005",
    icon: <HomeOutlined style={{ fontSize: 20 }} />,
    exact: true,
  },
  {
    label: "Templates PDF",
    href: "/",
    icon: <DescriptionOutlined style={{ fontSize: 20 }} />,
  },
];

const APPS: AppDefinition[] = [
  {
    id: "workspace",
    name: "Workspace",
    icon: "W",
    url: process.env.NEXT_PUBLIC_WORKSPACE_DOMAIN ?? "http://localhost:3005",
  },
];

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const user = useSessionStore((s) => s.user);
  const workspace = useSessionStore((s) => s.activeWorkspace);

  const handleLogout = useCallback(async () => {
    await apiFetch("/api/auth/logout", { method: "POST" });
    window.location.href =
      process.env.NEXT_PUBLIC_AUTH_API_AUTH_DOMAIN ?? "http://localhost:3001";
  }, []);

  const userSummary: UserSummary | null = user
    ? { id: user.id, username: user.username, email: user.email }
    : null;

  return (
    <AppShell
      sidebar={
        <Sidebar
          navItems={NAV_ITEMS}
          bottomSlot={
            <UserFooter user={userSummary} onLogout={handleLogout} />
          }
          topSlot={<WorkspaceSwitcher />}
        />
      }
      topBar={
        <TopBar
          apps={APPS}
          allAppsUrl={process.env.NEXT_PUBLIC_WORKSPACE_DOMAIN ?? "http://localhost:3005"}
          user={userSummary}
          preferencesUrl={`${process.env.NEXT_PUBLIC_WORKSPACE_DOMAIN ?? "http://localhost:3005"}/preferences`}
          onLogout={handleLogout}
        />
      }
    >
      {children}
    </AppShell>
  );
}
