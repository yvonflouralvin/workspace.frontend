"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSessionStore } from "@repo/auth/store/session.store";
import { usePermissions } from "@repo/auth/hooks/usePermissions";
import { useLogout } from "@repo/auth/hooks/useLogout";
import { AppShell } from "@repo/ui/shell/AppShell";
import { Sidebar } from "@repo/ui/shell/Sidebar";
import { TopBar } from "@repo/ui/shell/TopBar";
import { UserFooter } from "@repo/ui/shell/UserFooter";
import { WorkspaceSwitcher } from "@repo/ui/WorkspaceSwitcher";
import { appsAutorisees, BUSINESS_FIRM_MISSIONS_SHELL } from "@repo/ui/shell/platform";
import {
  HomeOutlined,
  PeopleAltOutlined,
  AssignmentTurnedInOutlined,
  GavelOutlined,
  ReceiptLongOutlined,
} from "@mui/icons-material";
import type { NavItem } from "@repo/ui/types/shell";
import { menuDeSession } from "@repo/ui/shell/AccueilApp";
import { estClientSeul } from "@/lib/permissions";

const WORKSPACE_DOMAIN = process.env.NEXT_PUBLIC_WORKSPACE_DOMAIN ?? "http://localhost:3005";

const NAV_ITEMS: NavItem[] = [
  {
    label: "Accueil",
    href: WORKSPACE_DOMAIN,
    icon: <HomeOutlined style={{ fontSize: 20 }} />,
    exact: true,
    accueil: true,
  },
  { label: "Clients", href: "/clients", icon: <PeopleAltOutlined style={{ fontSize: 20 }} /> },
  { label: "Missions", href: "/missions", icon: <AssignmentTurnedInOutlined style={{ fontSize: 20 }} /> },
  { label: "Audit", href: "/audit", icon: <GavelOutlined style={{ fontSize: 20 }} /> },
  { label: "Assistance fiscale", href: "/fiscal", icon: <ReceiptLongOutlined style={{ fontSize: 20 }} /> },
];

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const { user } = useSessionStore();
  const { can } = usePermissions();
  const landingAppKey = useSessionStore((s) => s.accueil?.landing_app_key);
  const appsActifs = useSessionStore((s) => s.activeWorkspace?.apps_actifs);
  const handleLogout = useLogout("/api/auth/logout");
  const router = useRouter();
  const permissions = useSessionStore((s) => s.permissions);
  // Un contact client n'a rien à faire dans les écrans internes : on le ramène à son espace plutôt
  // que de lui laisser voir des écrans qui ne se chargeraient pas.
  const client = estClientSeul(permissions ?? []);
  useEffect(() => {
    if (client) router.replace("/portail");
  }, [client, router]);

  const userSummary = user
    ? { id: user.id, username: user.username, email: user.email }
    : null;

  const visibleApps = appsAutorisees(can, appsActifs);

  if (client) return null;

  return (
    <AppShell
      sidebar={
        <Sidebar
          topSlot={<WorkspaceSwitcher filterPermission="business_firm_missions.access" />}
          navItems={menuDeSession(NAV_ITEMS, can, landingAppKey)}
          bottomSlot={<UserFooter user={userSummary} onLogout={handleLogout} />}
        />
      }
      topBar={
        <TopBar
          apps={visibleApps}
          allAppsUrl={WORKSPACE_DOMAIN}
          user={userSummary}
          preferencesUrl={`${WORKSPACE_DOMAIN}/preferences`}
          onLogout={handleLogout}
          {...BUSINESS_FIRM_MISSIONS_SHELL}
        />
      }
    >
      {children}
    </AppShell>
  );
}
