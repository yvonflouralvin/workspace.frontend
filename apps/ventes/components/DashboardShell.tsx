"use client";

import { useSessionStore } from "@repo/auth/store/session.store";
import { usePermissions } from "@repo/auth/hooks/usePermissions";
import { useLogout } from "@repo/auth/hooks/useLogout";
import { AppShell } from "@repo/ui/shell/AppShell";
import { Sidebar } from "@repo/ui/shell/Sidebar";
import { TopBar } from "@repo/ui/shell/TopBar";
import { DeviseSelector } from "@/components/DeviseProvider";
import { NotificationBell } from "@repo/notifications/NotificationBell";
import { UserFooter } from "@repo/ui/shell/UserFooter";
import { WorkspaceSwitcher } from "@repo/ui/WorkspaceSwitcher";
import { PLATFORM_APPS, VENTES_SHELL } from "@repo/ui/shell/platform";
import {
  QueryStatsOutlined,
  HomeOutlined,
  PeopleAltOutlined,
  Inventory2Outlined,
  ShoppingCartOutlined,
  ReceiptLongOutlined,
  SettingsOutlined,
} from "@mui/icons-material";
import type { NavItem } from "@repo/ui/types/shell";
import { entreesAutorisees } from "@repo/ui/shell/AccueilApp";

// Chaque entrée porte la permission qui l'ouvre. Sans elle, le menu affiche des
// portes verrouillées : l'utilisateur clique, prend un 403, et croit que son
// compte est cassé. L'ORDRE compte aussi — c'est celui dans lequel la porte
// d'entrée de l'app cherche où atterrir (cf. `AccueilApp`).
export const NAV_ITEMS: NavItem[] = [
  {
    label: "Accueil",
    href: process.env.NEXT_PUBLIC_WORKSPACE_DOMAIN ?? "http://localhost:3005",
    icon: <HomeOutlined style={{ fontSize: 20 }} />,
    exact: true,
  },
  { label: "Tableau de bord", href: "/tableau-de-bord", icon: <QueryStatsOutlined style={{ fontSize: 20 }} />, permission: "ventes.commandes.view" },
  { label: "Clients",    href: "/clients",    icon: <PeopleAltOutlined style={{ fontSize: 20 }} />, permission: "ventes.clients.view" },
  { label: "Produits",   href: "/produits",   icon: <Inventory2Outlined style={{ fontSize: 20 }} />, permission: "ventes.produits.view" },
  { label: "Commandes",  href: "/commandes",  icon: <ShoppingCartOutlined style={{ fontSize: 20 }} />, permission: "ventes.commandes.view" },
  { label: "Factures",   href: "/factures",   icon: <ReceiptLongOutlined style={{ fontSize: 20 }} />, permission: "ventes.factures.view" },
  { label: "Paramètres", href: "/parametres", icon: <SettingsOutlined style={{ fontSize: 20 }} />, permission: "ventes.settings.manage" },
];

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const { user } = useSessionStore();
  const { can } = usePermissions();
  const handleLogout = useLogout("/api/auth/logout");

  const userSummary = user
    ? { id: user.id, username: user.username, email: user.email }
    : null;

  const visibleApps = PLATFORM_APPS.filter((app) => can(`${app.id}.access`));

  return (
    <AppShell
      sidebar={
        <Sidebar
          topSlot={<WorkspaceSwitcher filterPermission="ventes.access" />}
          navItems={entreesAutorisees(NAV_ITEMS, can)}
          bottomSlot={<UserFooter user={userSummary} onLogout={handleLogout} />}
        />
      }
      topBar={
        <TopBar
          extraActions={<DeviseSelector />}
          notifications={<NotificationBell basePath="/api/notifications" />}
          apps={visibleApps}
          allAppsUrl="/"
          user={userSummary}
          preferencesUrl="/"
          onLogout={handleLogout}
          {...VENTES_SHELL}
        />
      }
    >
      {children}
    </AppShell>
  );
}
