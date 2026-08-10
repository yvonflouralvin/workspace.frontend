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
import { PLATFORM_APPS, SGR_SHELL } from "@repo/ui/shell/platform";
import {
  DescriptionOutlined,
  EventOutlined,
  FolderOpenOutlined,
  HomeOutlined,
  SettingsOutlined,
} from "@mui/icons-material";
import type { NavItem } from "@repo/ui/types/shell";

/** Deux publics, un seul menu — filtré par les droits.
 *
 *  Le candidat ne voit que « Mon dossier » et « Rendez-vous » : lui montrer une
 *  file de dossiers qu'il ne peut pas ouvrir serait une porte fermée de plus.
 *  L'agent voit la file ; le Secrétariat voit en plus les réglages.
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
    {
      label: "Mon dossier",
      href: "/mon-dossier",
      icon: <DescriptionOutlined style={{ fontSize: 20 }} />,
    },
    ...(can("sgr.dossiers.view")
      ? [
          {
            label: "Dossiers",
            href: "/dossiers",
            icon: <FolderOpenOutlined style={{ fontSize: 20 }} />,
          },
        ]
      : []),
    { label: "Rendez-vous", href: "/rendez-vous", icon: <EventOutlined style={{ fontSize: 20 }} /> },
    ...(can("sgr.referentiel.manage")
      ? [
          {
            label: "Paramètres",
            href: "/parametres",
            icon: <SettingsOutlined style={{ fontSize: 20 }} />,
          },
        ]
      : []),
  ];

  const userSummary = user
    ? { id: user.id, username: user.username, email: user.email }
    : null;

  const visibleApps = PLATFORM_APPS.filter((app) => can(`${app.id}.access`));

  return (
    <AppShell
      sidebar={
        <Sidebar
          topSlot={<WorkspaceSwitcher filterPermission="sgr.access" />}
          navItems={navItems}
          bottomSlot={<UserFooter user={userSummary} onLogout={handleLogout} />}
        />
      }
      topBar={
        <TopBar
          notifications={<NotificationBell basePath="/api/notifications" />}
          apps={visibleApps}
          allAppsUrl="/"
          user={userSummary}
          preferencesUrl="/"
          onLogout={handleLogout}
          {...SGR_SHELL}
        />
      }
    >
      {children}
    </AppShell>
  );
}
