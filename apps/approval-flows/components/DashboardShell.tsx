"use client";

import { useSessionStore } from "@repo/auth/store/session.store";
import { usePermissions } from "@repo/auth/hooks/usePermissions";
import { useLogout } from "@repo/auth/hooks/useLogout";
import { AppShell } from "@repo/ui/shell/AppShell";
import { Sidebar } from "@repo/ui/shell/Sidebar";
import { TopBar } from "@repo/ui/shell/TopBar";
import { UserFooter } from "@repo/ui/shell/UserFooter";
import { WorkspaceSwitcher } from "@repo/ui/WorkspaceSwitcher";
import { PLATFORM_APPS, APPROVAL_FLOWS_SHELL } from "@repo/ui/shell/platform";
import { useSearch } from "@repo/ui/shell/useSearch";
import { HomeOutlined, AccountTreeOutlined, AssignmentTurnedInOutlined, OutboxOutlined } from "@mui/icons-material";
import type { NavItem } from "@repo/ui/types/shell";

const NAV_ITEMS: NavItem[] = [
  { label: "MyRequest", href: "/", icon: <HomeOutlined style={{ fontSize: 20 }} />, exact: true },
  { label: "Requests", href: "/requests", icon: <AssignmentTurnedInOutlined style={{ fontSize: 20 }} /> },
  { label: "Flows", href: "/flows", icon: <AccountTreeOutlined style={{ fontSize: 20 }} /> },
  { label: "Submission", href: "/submissions", icon: <OutboxOutlined style={{ fontSize: 20 }} /> },
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

  return (
    <AppShell
      sidebar={
        <Sidebar
          topSlot={<WorkspaceSwitcher filterPermission="approval_flows.access" />}
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
          onSearch={handleSearch}
          {...APPROVAL_FLOWS_SHELL}
        />
      }
    >
      {children}
    </AppShell>
  );
}
