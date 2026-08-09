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
import { PLATFORM_APPS, APPROVAL_FLOWS_SHELL } from "@repo/ui/shell/platform";
import { useSearch } from "@repo/ui/shell/useSearch";
import { HomeOutlined, AccountTreeOutlined, AssignmentTurnedInOutlined, OutboxOutlined } from "@mui/icons-material";
import type { NavItem } from "@repo/ui/types/shell";

/** La navigation, et ce qu'il faut pour voir chaque entrée.
 *
 *  « Mes demandes » et « À traiter » sont les écrans de TOUT LE MONDE : sa
 *  propre file, ses propres demandes. Concevoir les flux et lire toutes les
 *  soumissions du workspace sont deux responsabilités distinctes, et une barre
 *  qui les affiche à qui ne les a pas promet ce qu'elle ne tiendra pas. */
const NAV_ITEMS: (NavItem & { permission?: string })[] = [
  { label: "Mes demandes", href: "/", icon: <HomeOutlined style={{ fontSize: 20 }} />, exact: true },
  { label: "À traiter", href: "/requests", icon: <AssignmentTurnedInOutlined style={{ fontSize: 20 }} /> },
  {
    label: "Flux",
    href: "/flows",
    icon: <AccountTreeOutlined style={{ fontSize: 20 }} />,
    permission: "approval_flows.manage",
  },
  {
    label: "Soumissions",
    href: "/submissions",
    icon: <OutboxOutlined style={{ fontSize: 20 }} />,
    permission: "approval_flows.requests.view_all",
  },
];

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const { user } = useSessionStore();
  const { can } = usePermissions();
  const handleLogout = useLogout();
  const handleSearch = useSearch();

  const userSummary = user
    ? { id: user.id, username: user.username, email: user.email }
    : null;

  const visibleApps = PLATFORM_APPS.filter((app) => can(`${app.id}.access`));
  const navItems = NAV_ITEMS.filter((item) => !item.permission || can(item.permission));

  return (
    <AppShell
      sidebar={
        <Sidebar
          topSlot={<WorkspaceSwitcher filterPermission="approval_flows.access" />}
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
          onSearch={handleSearch}
          {...APPROVAL_FLOWS_SHELL}
        />
      }
    >
      {children}
    </AppShell>
  );
}
