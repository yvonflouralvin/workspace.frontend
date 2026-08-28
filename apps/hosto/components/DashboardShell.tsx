"use client";

import { useSessionStore } from "@repo/auth/store/session.store";
import { usePermissions } from "@repo/auth/hooks/usePermissions";
import { useLogout } from "@repo/auth/hooks/useLogout";
import { AppShell } from "@repo/ui/shell/AppShell";
import { Sidebar } from "@repo/ui/shell/Sidebar";
import { TopBar } from "@repo/ui/shell/TopBar";
import { UserFooter } from "@repo/ui/shell/UserFooter";
import { WorkspaceSwitcher } from "@repo/ui/WorkspaceSwitcher";
import { PLATFORM_APPS, HOSTO_SHELL } from "@repo/ui/shell/platform";
import { NotificationBell } from "@repo/notifications/NotificationBell";
import { useSearch } from "@repo/ui/shell/useSearch";
import {
  HomeOutlined,
  SpaceDashboardOutlined,
  BiotechOutlined,
  HealingOutlined,
  HotelOutlined,
  GridViewOutlined,
  CalendarMonthOutlined,
  LocalHospitalOutlined,
  MedicalInformationOutlined,
  MedicalServicesOutlined,
  MonitorHeartOutlined,
  PeopleAltOutlined,
  ScheduleOutlined,
  SensorDoorOutlined,
  SettingsOutlined,
} from "@mui/icons-material";
import type { NavItem } from "@repo/ui/types/shell";
import { menuDeSession } from "@repo/ui/shell/AccueilApp";

export const NAV_ITEMS: NavItem[] = [
  {
    label: "Accueil",
    href: process.env.NEXT_PUBLIC_WORKSPACE_DOMAIN ?? "http://localhost:3005",
    icon: <HomeOutlined style={{ fontSize: 20 }} />,
    exact: true,
    accueil: true,
  },
  { label: "Tableau de bord", href: "/tableau-de-bord", icon: <SpaceDashboardOutlined style={{ fontSize: 20 }} />, exact: true },
  { label: "Patients",      href: "/",             icon: <PeopleAltOutlined style={{ fontSize: 20 }} />,        permission: "hosto.menu.patients.access" },
  { label: "Services",      href: "/services",     icon: <LocalHospitalOutlined style={{ fontSize: 20 }} />,    permission: "hosto.menu.services.access" },
  { label: "Personnel",     href: "/staff",        icon: <MedicalServicesOutlined style={{ fontSize: 20 }} />,  permission: "hosto.menu.staff.access" },
  { label: "Réception",     href: "/reception",    icon: <SensorDoorOutlined style={{ fontSize: 20 }} />,       permission: "hosto.menu.reception.access" },
  { label: "Consultations", href: "/consultations",icon: <MedicalInformationOutlined style={{ fontSize: 20 }} />, permission: "hosto.menu.consultations.access" },
  { label: "Calendrier",    href: "/calendar",     icon: <CalendarMonthOutlined style={{ fontSize: 20 }} />,    permission: "hosto.menu.calendar.access" },
  { label: "Horaires",      href: "/schedules",    icon: <ScheduleOutlined style={{ fontSize: 20 }} />,         permission: "hosto.menu.schedules.access" },
  { label: "Laboratoire",   href: "/lab",          icon: <BiotechOutlined style={{ fontSize: 20 }} />,          permission: "hosto.menu.lab.access" },
  { label: "Actes",         href: "/actes",        icon: <HealingOutlined style={{ fontSize: 20 }} />,          permission: "hosto.menu.actes.access" },
  { label: "Occupation",    href: "/occupation",   icon: <GridViewOutlined style={{ fontSize: 20 }} />,         permission: "hosto.menu.occupation.access" },
  { label: "Lits",          href: "/beds",         icon: <HotelOutlined style={{ fontSize: 20 }} />,            permission: "hosto.menu.beds.access" },
  { label: "Surveillance",  href: "/surveillance", icon: <MonitorHeartOutlined style={{ fontSize: 20 }} />,     permission: "hosto.menu.surveillance.access" },
  { label: "Paramètres",    href: "/parametres",   icon: <SettingsOutlined style={{ fontSize: 20 }} />,         permission: "hosto.menu.settings.access" },
];

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const { user } = useSessionStore();
  const { can } = usePermissions();
  // « Accueil » mène chez CE membre : Workspace par défaut, sa page de
  // démarrage quand son groupe lui en a donné une.
  const landingAppKey = useSessionStore((s) => s.accueil?.landing_app_key);
  const handleLogout = useLogout();
  const handleSearch = useSearch();

  const userSummary = user
    ? { id: user.id, username: user.username, email: user.email }
    : null;

  const visibleApps = PLATFORM_APPS.filter((app) => can(`${app.id}.access`));

  const navItems = menuDeSession(NAV_ITEMS, can, landingAppKey);

  return (
    <AppShell
      sidebar={
        <Sidebar
          topSlot={<WorkspaceSwitcher filterPermission="hosto.access" />}
          navItems={navItems}
          bottomSlot={<UserFooter user={userSummary} onLogout={handleLogout} />}
        />
      }
      topBar={
        <TopBar
          apps={visibleApps}
          allAppsUrl="/"
          user={userSummary}
          preferencesUrl="/"
          notifications={<NotificationBell basePath="/api/notifications" />}
          onLogout={handleLogout}
          onSearch={handleSearch}
          {...HOSTO_SHELL}
        />
      }
    >
      {children}
    </AppShell>
  );
}
