"use client";

import { useSessionStore } from "@repo/auth/store/session.store";
import { usePermissions } from "@repo/auth/hooks/usePermissions";
import { useLogout } from "@repo/auth/hooks/useLogout";
import { AppShell } from "@repo/ui/shell/AppShell";
import { Sidebar } from "@repo/ui/shell/Sidebar";
import { TopBar } from "@repo/ui/shell/TopBar";
import { NotificationBell } from "@repo/notifications/NotificationBell";
import { UserFooter } from "@repo/ui/shell/UserFooter";
import { WorkspaceSwitcher } from "@repo/ui/WorkspaceSwitcher";
import { PLATFORM_APPS, ACADEMIQUE_SHELL } from "@repo/ui/shell/platform";
import {
  AccountTreeOutlined,
  EventOutlined,
  GroupsOutlined,
  HomeOutlined,
  SchoolOutlined,
  ClassOutlined,
} from "@mui/icons-material";
import type { NavItem } from "@repo/ui/types/shell";

/** Le menu se filtre sur les droits.
 *
 *  Le secrétariat inscrit et tient le registre ; la direction dessine la
 *  structure et ouvre les années. Montrer à l'un les écrans de l'autre ne
 *  ferait que des portes fermées.
 */
export function DashboardShell({ children }: { children: React.ReactNode }) {
  const { user } = useSessionStore();
  const { can } = usePermissions();
  const handleLogout = useLogout("/api/auth/logout");

  const navItems: NavItem[] = [
    {
      label: "Accueil",
      href: process.env.NEXT_PUBLIC_WORKSPACE_DOMAIN ?? "http://localhost:3005",
      icon: <HomeOutlined style={{ fontSize: 20 }} />,
      exact: true,
    },
    ...(can("academique.etudiants.view")
      ? [
          {
            label: "Étudiants",
            href: "/etudiants",
            icon: <GroupsOutlined style={{ fontSize: 20 }} />,
          },
        ]
      : []),
    ...(can("academique.structure.view")
      ? [
          {
            label: "Promotions",
            href: "/promotions",
            icon: <ClassOutlined style={{ fontSize: 20 }} />,
          },
          {
            label: "Structure",
            href: "/structure",
            icon: <AccountTreeOutlined style={{ fontSize: 20 }} />,
          },
          {
            label: "Enseignants",
            href: "/enseignants",
            icon: <SchoolOutlined style={{ fontSize: 20 }} />,
          },
          { label: "Années", href: "/annees", icon: <EventOutlined style={{ fontSize: 20 }} /> },
        ]
      : []),
  ];

  const userSummary = user
    ? { id: user.id, username: user.username, email: user.email }
    : null;

  return (
    <AppShell
      sidebar={
        <Sidebar
          topSlot={<WorkspaceSwitcher filterPermission="academique.access" />}
          navItems={navItems}
          bottomSlot={<UserFooter user={userSummary} onLogout={handleLogout} />}
        />
      }
      topBar={
        <TopBar
          notifications={<NotificationBell basePath="/api/notifications" />}
          apps={PLATFORM_APPS.filter((app) => can(`${app.id}.access`))}
          allAppsUrl="/"
          user={userSummary}
          preferencesUrl="/"
          onLogout={handleLogout}
          {...ACADEMIQUE_SHELL}
        />
      }
    >
      {children}
    </AppShell>
  );
}
