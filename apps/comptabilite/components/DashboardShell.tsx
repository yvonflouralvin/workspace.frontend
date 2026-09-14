"use client";

import { useSessionStore } from "@repo/auth/store/session.store";
import { usePermissions } from "@repo/auth/hooks/usePermissions";
import { useLogout } from "@repo/auth/hooks/useLogout";
import { AppShell } from "@repo/ui/shell/AppShell";
import { Sidebar } from "@repo/ui/shell/Sidebar";
import { TopBar } from "@repo/ui/shell/TopBar";
import { UserFooter } from "@repo/ui/shell/UserFooter";
import { WorkspaceSwitcher } from "@repo/ui/WorkspaceSwitcher";
import { appsAutorisees, COMPTABILITE_SHELL } from "@repo/ui/shell/platform";
import {
  HomeOutlined,
  MenuBookOutlined,
  AccountBalanceOutlined,
  BookOutlined,
  CalendarMonthOutlined,
  ListAltOutlined,
  AssessmentOutlined,
  ReceiptLongOutlined,
  PercentOutlined,
} from "@mui/icons-material";
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
  { label: "Écritures", href: "/ecritures", icon: <MenuBookOutlined style={{ fontSize: 20 }} />, exact: true },
  { label: "Plan comptable", href: "/comptes", icon: <AccountBalanceOutlined style={{ fontSize: 20 }} />, exact: true },
  { label: "Journaux", href: "/journaux", icon: <BookOutlined style={{ fontSize: 20 }} />, exact: true },
  { label: "Exercices", href: "/exercices", icon: <CalendarMonthOutlined style={{ fontSize: 20 }} />, exact: true },
  { label: "Grand livre", href: "/grand-livre", icon: <ListAltOutlined style={{ fontSize: 20 }} />, exact: true },
  { label: "Balance", href: "/balance", icon: <AssessmentOutlined style={{ fontSize: 20 }} />, exact: true },
  { label: "États financiers", href: "/etats", icon: <AssessmentOutlined style={{ fontSize: 20 }} />, exact: true },
  { label: "Taxes", href: "/taxes", icon: <PercentOutlined style={{ fontSize: 20 }} />, exact: true },
  { label: "Factures à comptabiliser", href: "/comptabiliser", icon: <ReceiptLongOutlined style={{ fontSize: 20 }} />, exact: true },
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
          topSlot={<WorkspaceSwitcher filterPermission="comptabilite.access" />}
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
          {...COMPTABILITE_SHELL}
        />
      }
    >
      {children}
    </AppShell>
  );
}
