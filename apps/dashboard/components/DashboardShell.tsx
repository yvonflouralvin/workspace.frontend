"use client";

import { useSessionStore } from "@repo/auth/store/session.store";
import { usePermissions } from "@repo/auth/hooks/usePermissions";
import { useLogout } from "@repo/auth/hooks/useLogout";
import { AppShell } from "@repo/ui/shell/AppShell";
import { Sidebar } from "@repo/ui/shell/Sidebar";
import { TopBar } from "@repo/ui/shell/TopBar";
import { UserFooter } from "@repo/ui/shell/UserFooter";
import { WorkspaceSwitcher } from "@repo/ui/WorkspaceSwitcher";
import { PLATFORM_APPS, DASHBOARD_SHELL } from "@repo/ui/shell/platform";
import { HomeOutlined, QueryStatsOutlined } from "@mui/icons-material";
import type { NavItem } from "@repo/ui/types/shell";

const NAV_ITEMS: NavItem[] = [
  {
    label: "Accueil",
    href: process.env.NEXT_PUBLIC_WORKSPACE_DOMAIN ?? "http://localhost:3005",
    icon: <HomeOutlined style={{ fontSize: 20 }} />,
    exact: true,
  },
  { label: "Rapports", href: "/", icon: <QueryStatsOutlined style={{ fontSize: 20 }} /> },
];

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const { user } = useSessionStore();
  const { can } = usePermissions();
  const handleLogout = useLogout("/api/auth/logout");

  const userSummary = user
    ? { id: user.id, username: user.username, email: user.email }
    : null;

  const visibleApps = PLATFORM_APPS.filter((app) => can(`${app.id}.access`));

  return (
    <AppShell
      sidebar={
        <Sidebar
          topSlot={<WorkspaceSwitcher filterPermission="dashboard.access" />}
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
          {...DASHBOARD_SHELL}
        />
      }
    >
      {children}
    </AppShell>
  );
}
