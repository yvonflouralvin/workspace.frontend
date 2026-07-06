"use client";

import React from "react";
import { useSessionStore } from "@repo/auth/store/session.store";
import { usePermissions } from "@repo/auth/hooks/usePermissions";
import { AppShell } from "@repo/ui/shell/AppShell";
import { Sidebar } from "@repo/ui/shell/Sidebar";
import { TopBar } from "@repo/ui/shell/TopBar";
import { UserFooter } from "@repo/ui/shell/UserFooter";
import { WorkspaceSwitcher } from "@repo/ui/WorkspaceSwitcher";
import {
  Inventory2Outlined,
  CategoryOutlined,
} from "@mui/icons-material";
import type { NavItem, AppDefinition } from "@repo/ui/types/shell";
import { logout as logoutRequest } from "@/lib/stock-api";

const NAV_ITEMS: NavItem[] = [
  {
    label: "Articles",
    href: "/items",
    icon: <Inventory2Outlined style={{ fontSize: 20 }} />,
  },
  {
    label: "Catégories",
    href: "/categories",
    icon: <CategoryOutlined style={{ fontSize: 20 }} />,
  },
];

const ROUTE_LABELS: Record<string, string> = {
  "/items": "Articles",
  "/categories": "Catégories",
};

const ROUTE_ICONS: Record<string, React.ReactNode> = {
  "/items":      <Inventory2Outlined style={{ fontSize: 15 }} />,
  "/categories": <CategoryOutlined style={{ fontSize: 15 }} />,
};

const APPS: AppDefinition[] = [
  {
    id: "workspace",
    name: "Workspace",
    icon: "W",
    url: process.env.NEXT_PUBLIC_WORKSPACE_DOMAIN ?? "http://localhost:3005",
    color: "#3525cd",
    description: "Tableau de bord principal",
  },
  {
    id: "stock",
    name: "Stock",
    icon: "S",
    url: "http://localhost:3010",
    color: "#006c49",
    description: "Stock & Inventaire",
  },
];

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const { user, logout } = useSessionStore();
  const { can } = usePermissions();

  const userSummary = user
    ? { id: user.id, username: user.username, email: user.email }
    : null;

  const visibleApps = APPS.filter((app) => can(`${app.id}.access`));

  async function handleLogout() {
    logout();
    await logoutRequest();
    window.location.href =
      process.env.NEXT_PUBLIC_AUTH_API_AUTH_DOMAIN ?? "http://localhost:3001";
  }

  return (
    <AppShell
      sidebar={
        <Sidebar
          topSlot={<WorkspaceSwitcher filterPermission="stock.access" />}
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
          appName="Stock"
          appHref="/items"
          routeLabels={ROUTE_LABELS}
          routeIcons={ROUTE_ICONS}
        />
      }
    >
      {children}
    </AppShell>
  );
}
