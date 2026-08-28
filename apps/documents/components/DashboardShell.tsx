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
import { PLATFORM_APPS, DOCUMENTS_SHELL } from "@repo/ui/shell/platform";
import { DescriptionOutlined, HomeOutlined } from "@mui/icons-material";
import type { NavItem, UserSummary } from "@repo/ui/types/shell";
import { menuDeSession } from "@repo/ui/shell/AccueilApp";

const WORKSPACE_DOMAIN = process.env.NEXT_PUBLIC_WORKSPACE_DOMAIN ?? "http://localhost:3005";

// Chaque entrée porte la permission qui l'ouvre. Sans elle, le menu affiche des
// portes verrouillées : l'utilisateur clique, prend un 403, et croit que son
// compte est cassé. L'ORDRE compte aussi — c'est celui dans lequel la porte
// d'entrée de l'app cherche où atterrir (cf. `AccueilApp`).
export const NAV_ITEMS: NavItem[] = [
  {
    label: "Accueil",
    href: WORKSPACE_DOMAIN,
    icon: <HomeOutlined style={{ fontSize: 20 }} />,
    exact: true,
    accueil: true,
  },
  {
    label: "Templates PDF",
    href: "/",
    icon: <DescriptionOutlined style={{ fontSize: 20 }} />,
    permission: "documents.templates.view",
  },
];

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const { user } = useSessionStore();
  const { can } = usePermissions();
  // « Accueil » mène chez CE membre : Workspace par défaut, sa page de
  // démarrage quand son groupe lui en a donné une.
  const landingAppKey = useSessionStore((s) => s.accueil?.landing_app_key);
  const handleLogout = useLogout("/api/auth/logout");

  const userSummary: UserSummary | null = user
    ? { id: user.id, username: user.username, email: user.email }
    : null;

  const visibleApps = PLATFORM_APPS.filter((app) => can(`${app.id}.access`));

  return (
    <AppShell
      sidebar={
        <Sidebar
          navItems={menuDeSession(NAV_ITEMS, can, landingAppKey)}
          bottomSlot={<UserFooter user={userSummary} onLogout={handleLogout} />}
          topSlot={<WorkspaceSwitcher />}
        />
      }
      topBar={
        <TopBar
          notifications={<NotificationBell basePath="/api/notifications" />}
          apps={visibleApps}
          allAppsUrl={WORKSPACE_DOMAIN}
          user={userSummary}
          preferencesUrl={`${WORKSPACE_DOMAIN}/preferences`}
          onLogout={handleLogout}
          {...DOCUMENTS_SHELL}
        />
      }
    >
      {children}
    </AppShell>
  );
}
