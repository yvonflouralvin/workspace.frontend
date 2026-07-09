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
import { useSearch } from "@repo/ui/shell/useSearch";
import {
  HomeOutlined,
  BiotechOutlined,
  HealingOutlined,
  CalendarMonthOutlined,
  LocalHospitalOutlined,
  MedicalInformationOutlined,
  MedicalServicesOutlined,
  PeopleAltOutlined,
  ScheduleOutlined,
  SensorDoorOutlined,
  SettingsOutlined,
} from "@mui/icons-material";
import type { NavItem } from "@repo/ui/types/shell";

const NAV_ITEMS: NavItem[] = [
  {
    label: "Accueil",
    href: process.env.NEXT_PUBLIC_WORKSPACE_DOMAIN ?? "http://localhost:3005",
    icon: <HomeOutlined style={{ fontSize: 20 }} />,
    exact: true,
  },
  { label: "Patients",      href: "/",             icon: <PeopleAltOutlined style={{ fontSize: 20 }} /> },
  { label: "Services",      href: "/services",     icon: <LocalHospitalOutlined style={{ fontSize: 20 }} /> },
  { label: "Personnel",     href: "/staff",        icon: <MedicalServicesOutlined style={{ fontSize: 20 }} /> },
  { label: "Réception",     href: "/reception",    icon: <SensorDoorOutlined style={{ fontSize: 20 }} /> },
  { label: "Consultations", href: "/consultations",icon: <MedicalInformationOutlined style={{ fontSize: 20 }} /> },
  { label: "Calendrier",    href: "/calendar",     icon: <CalendarMonthOutlined style={{ fontSize: 20 }} /> },
  { label: "Horaires",      href: "/schedules",    icon: <ScheduleOutlined style={{ fontSize: 20 }} /> },
  { label: "Laboratoire",   href: "/lab",          icon: <BiotechOutlined style={{ fontSize: 20 }} /> },
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

  const baseNav = can("hosto.actes.view")
    ? [...NAV_ITEMS, { label: "Actes", href: "/actes", icon: <HealingOutlined style={{ fontSize: 20 }} /> }]
    : NAV_ITEMS;

  const navItems = can("hosto.settings.manage")
    ? [...baseNav, { label: "Paramètres", href: "/parametres", icon: <SettingsOutlined style={{ fontSize: 20 }} /> }]
    : baseNav;

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
