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
import { PLATFORM_APPS, ISP_SHELL } from "@repo/ui/shell/platform";
import {
  DescriptionOutlined,
  GroupsOutlined,
  HomeOutlined,
  HomeWorkOutlined,
  SettingsOutlined,
  WorkOutlineOutlined,
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
    { label: "Mémoires", href: "/memoires", icon: <DescriptionOutlined style={{ fontSize: 20 }} /> },
    { label: "Projets tutorés", href: "/projets", icon: <GroupsOutlined style={{ fontSize: 20 }} /> },
    { label: "Stages", href: "/stages", icon: <WorkOutlineOutlined style={{ fontSize: 20 }} /> },
    ...(can("isp.travaux.instruire")
      ? [
          {
            label: "Dépôts de mémoire",
            href: "/depots",
            icon: <HomeWorkOutlined style={{ fontSize: 20 }} />,
          },
        ]
      : []),
    ...(can("isp.referentiel.manage")
      ? [
          {
            label: "Référentiel",
            href: "/referentiel",
            icon: <SettingsOutlined style={{ fontSize: 20 }} />,
          },
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
          topSlot={<WorkspaceSwitcher filterPermission="isp.access" />}
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
          {...ISP_SHELL}
        />
      }
    >
      {children}
    </AppShell>
  );
}
