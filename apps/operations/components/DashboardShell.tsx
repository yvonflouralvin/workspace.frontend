"use client";

import { useSessionStore } from "@repo/auth/store/session.store";
import { usePermissions } from "@repo/auth/hooks/usePermissions";
import { useLogout } from "@repo/auth/hooks/useLogout";
import { AppShell } from "@repo/ui/shell/AppShell";
import { Sidebar } from "@repo/ui/shell/Sidebar";
import { TopBar } from "@repo/ui/shell/TopBar";
import { UserFooter } from "@repo/ui/shell/UserFooter";
import { WorkspaceSwitcher } from "@repo/ui/WorkspaceSwitcher";
import { PLATFORM_APPS, OPERATIONS_SHELL } from "@repo/ui/shell/platform";
import {
  ChecklistOutlined,
  EventOutlined,
  HomeOutlined,
  BoltOutlined,
  MeetingRoomOutlined,
  SettingsOutlined,
} from "@mui/icons-material";
import type { NavItem } from "@repo/ui/types/shell";
import { menuDeSession } from "@repo/ui/shell/AccueilApp";

// Un menu = un SUJET d'opérations, pas un écran. Ce qu'on regarde d'un sujet se
// choisit dans la page, par un sélecteur — sans quoi cette barre s'allongerait
// d'un cran à chaque écran ajouté, et le lien entre écrans d'un même sujet se
// perdrait.
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
    accueil: true,
  },
  {
    label: "Plannings",
    href: "/plannings",
    icon: <EventOutlined style={{ fontSize: 20 }} />,
    permission: "operations.plannings.view",
  },
  {
    label: "Salles",
    href: "/salles",
    icon: <MeetingRoomOutlined style={{ fontSize: 20 }} />,
    permission: "operations.reservations.demander",
  },
  {
    label: "Groupes",
    href: "/groupes",
    icon: <BoltOutlined style={{ fontSize: 20 }} />,
    permission: "operations.groupes.manage",
  },
  {
    label: "Process",
    href: "/process",
    icon: <ChecklistOutlined style={{ fontSize: 20 }} />,
    permission: "operations.process.view",
  },
  {
    label: "Paramètres",
    href: "/parametres",
    icon: <SettingsOutlined style={{ fontSize: 20 }} />,
    permission: "operations.settings.manage",
  },
];

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const { user } = useSessionStore();
  const { can } = usePermissions();
  // « Accueil » mène chez CE membre : Workspace par défaut, sa page de
  // démarrage quand son groupe lui en a donné une.
  const landingAppKey = useSessionStore((s) => s.accueil?.landing_app_key);
  const handleLogout = useLogout("/api/auth/logout");

  const userSummary = user
    ? { id: user.id, username: user.username, email: user.email }
    : null;

  const visibleApps = PLATFORM_APPS.filter((app) => can(`${app.id}.access`));

  return (
    <AppShell
      sidebar={
        <Sidebar
          topSlot={<WorkspaceSwitcher filterPermission="operations.access" />}
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
          {...OPERATIONS_SHELL}
        />
      }
    >
      {children}
    </AppShell>
  );
}
