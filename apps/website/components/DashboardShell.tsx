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
import { PLATFORM_APPS, WEBSITE_SHELL } from "@repo/ui/shell/platform";
import { HomeOutlined, LanguageOutlined } from "@mui/icons-material";
import type { NavItem } from "@repo/ui/types/shell";

/** La coque de l'application.
 *
 *  Le BUILDER ne s'en sert pas : il occupe tout l'écran. Une barre latérale à
 *  côté d'un canevas et d'un inspecteur ne laisserait plus de place pour voir
 *  la page qu'on construit.
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
    ...(can("website.sites.view")
      ? [
          {
            label: "Sites",
            href: "/",
            icon: <LanguageOutlined style={{ fontSize: 20 }} />,
            exact: true,
          },
        ]
      : []),
  ];

  const userSummary = user ? { id: user.id, username: user.username, email: user.email } : null;

  return (
    <AppShell
      sidebar={
        <Sidebar
          topSlot={<WorkspaceSwitcher filterPermission="website.access" />}
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
          {...WEBSITE_SHELL}
        />
      }
    >
      {children}
    </AppShell>
  );
}
