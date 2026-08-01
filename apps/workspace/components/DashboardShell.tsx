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
import { PLATFORM_APPS, WORKSPACE_SHELL } from "@repo/ui/shell/platform";
import { useSearch } from "@repo/ui/shell/useSearch";
import {
  CalendarMonthOutlined,
  HomeOutlined,
  FolderOpenOutlined,
  GroupOutlined,
  InboxOutlined,
  HistoryOutlined,
  ChecklistOutlined,
  SettingsOutlined,
  HelpOutlineOutlined,
} from "@mui/icons-material";
import type { NavItem } from "@repo/ui/types/shell";

const NAV_ITEMS: NavItem[] = [
  { label: "Accueil",  href: "/",         icon: <HomeOutlined style={{ fontSize: 20 }} />,        exact: true },
  { label: "Projets",  href: "/projects",  icon: <FolderOpenOutlined style={{ fontSize: 20 }} /> },
  { label: "Tâches",   href: "/tasks",     icon: <ChecklistOutlined style={{ fontSize: 20 }} /> },
  { label: "Calendrier", href: "/calendar", icon: <CalendarMonthOutlined style={{ fontSize: 20 }} /> },
  { label: "Membres",  href: "/members",   icon: <GroupOutlined style={{ fontSize: 20 }} /> },
  { label: "Inbox",    href: "/inbox",     icon: <InboxOutlined style={{ fontSize: 20 }} /> },
  { label: "Journal d'activité", href: "/audit-logs", icon: <HistoryOutlined style={{ fontSize: 20 }} /> },
];

const SECONDARY_ITEMS: NavItem[] = [
  { label: "Paramètres", href: "/settings", icon: <SettingsOutlined style={{ fontSize: 20 }} /> },
  { label: "Aide",       href: "/help",     icon: <HelpOutlineOutlined style={{ fontSize: 20 }} /> },
];

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const { user, activeWorkspace } = useSessionStore();
  const { can } = usePermissions();
  const handleLogout = useLogout();
  const handleSearch = useSearch();

  const userSummary = user
    ? { id: user.id, username: user.username, email: user.email }
    : null;

  const visibleApps = PLATFORM_APPS.filter((app) => can(`${app.id}.access`));

  // Pas de rôle stocké côté auth : on l'affiche d'après la propriété du
  // workspace et les droits d'administration détenus.
  const roleLabel = activeWorkspace?.is_owner
    ? "Propriétaire"
    : can("workspace.settings.manage") || can("members.manage")
      ? "Administrateur"
      : "Membre";

  return (
    <AppShell
      sidebar={
        <Sidebar
          topSlot={<WorkspaceSwitcher />}
          navItems={NAV_ITEMS}
          secondaryItems={SECONDARY_ITEMS}
          bottomSlot={<UserFooter user={userSummary} onLogout={handleLogout} subtitle={roleLabel} />}
        />
      }
      topBar={
        <TopBar
          notifications={<NotificationBell basePath="/api/notifications" />}
          apps={visibleApps}
          allAppsUrl="/apps"
          user={userSummary}
          preferencesUrl="/preferences"
          onLogout={handleLogout}
          onSearch={handleSearch}
          variant="search-first"
          {...WORKSPACE_SHELL}
        />
      }
    >
      {children}
    </AppShell>
  );
}
