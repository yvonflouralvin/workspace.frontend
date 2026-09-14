"use client";

import { useSessionStore } from "@repo/auth/store/session.store";
import { usePermissions } from "@repo/auth/hooks/usePermissions";
import { useLogout } from "@repo/auth/hooks/useLogout";
import { AppShell } from "@repo/ui/shell/AppShell";
import { Sidebar } from "@repo/ui/shell/Sidebar";
import { TopBar } from "@repo/ui/shell/TopBar";
import { UserFooter } from "@repo/ui/shell/UserFooter";
import { WorkspaceSwitcher } from "@repo/ui/WorkspaceSwitcher";
import { appsAutorisees, AUDIT_MISSIONS_SHELL } from "@repo/ui/shell/platform";
import { HomeOutlined, WorkOutlineOutlined } from "@mui/icons-material";
import type { NavItem } from "@repo/ui/types/shell";
import { menuDeSession } from "@repo/ui/shell/AccueilApp";

const NAV_ITEMS: NavItem[] = [
  {
    label: "Accueil",
    href: process.env.NEXT_PUBLIC_WORKSPACE_DOMAIN ?? "http://localhost:3005",
    icon: <HomeOutlined style={{ fontSize: 20 }} />,
    exact: true,
    accueil: true,
  },
  { label: "Missions", href: "/missions", icon: <WorkOutlineOutlined style={{ fontSize: 20 }} />, exact: true },
];

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const { user } = useSessionStore();
  const { can } = usePermissions();
  const landingAppKey = useSessionStore((s) => s.accueil?.landing_app_key);
  const appsActifs = useSessionStore((s) => s.activeWorkspace?.apps_actifs);
  const handleLogout = useLogout("/api/auth/logout");

  const userSummary = user
    ? { id: user.id, username: user.username, email: user.email }
    : null;

  const visibleApps = appsAutorisees(can, appsActifs);

  return (
    <AppShell
      sidebar={
        <Sidebar
          topSlot={<WorkspaceSwitcher filterPermission="audit_missions.access" />}
          navItems={menuDeSession(NAV_ITEMS, can, landingAppKey)}
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
          {...AUDIT_MISSIONS_SHELL}
        />
      }
    >
      {children}
    </AppShell>
  );
}
