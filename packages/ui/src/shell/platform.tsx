import React from "react";
import {
  HomeOutlined,
  FolderOpenOutlined,
  GroupOutlined,
  InboxOutlined,
  HistoryOutlined,
  SettingsOutlined,
  HelpOutlineOutlined,
  PeopleAltOutlined,
  LocalHospitalOutlined,
  MedicalServicesOutlined,
  SensorDoorOutlined,
  MedicalInformationOutlined,
  CalendarMonthOutlined,
  ScheduleOutlined,
  BiotechOutlined,
  Inventory2Outlined,
  CategoryOutlined,
  GroupsOutlined,
} from "@mui/icons-material";
import type { AppDefinition } from "../types/shell";

export interface AppShellConfig {
  appName: string;
  appHref: string;
  routeLabels: Record<string, string>;
  routeIcons: Record<string, React.ReactNode>;
}

export const PLATFORM_APPS: AppDefinition[] = [
  {
    id: "workspace",
    name: "Workspace",
    icon: "W",
    url: process.env.NEXT_PUBLIC_WORKSPACE_DOMAIN ?? "http://localhost:3005",
    color: "#3525cd",
    description: "Tableau de bord principal",
  },
  {
    id: "hr",
    name: "RH",
    icon: "H",
    url: process.env.NEXT_PUBLIC_AUTH_API_HR_DOMAIN ?? "http://localhost:3003",
    color: "#006c49",
    description: "Ressources humaines",
  },
  {
    id: "approval_flows",
    name: "Workflows d'approbation",
    icon: "A",
    url: process.env.NEXT_PUBLIC_AUTH_API_APPROVAL_FLOWS_DOMAIN ?? "http://localhost:3006",
    color: "#004598",
    description: "Création et gestion de workflows d'approbation",
  },
  {
    id: "hosto",
    name: "Patient",
    icon: "P",
    url: process.env.NEXT_PUBLIC_AUTH_API_HOSTO_DOMAIN ?? "http://localhost:3007",
    color: "#0e7490",
    description: "Gestion des dossiers des patients",
  },
  {
    id: "tiers",
    name: "Tiers",
    icon: "T",
    url: process.env.NEXT_PUBLIC_AUTH_API_TIERS_DOMAIN ?? "http://localhost:3009",
    color: "#b45309",
    description: "Clients et fournisseurs",
  },
  {
    id: "stock",
    name: "Stock",
    icon: "S",
    url: process.env.NEXT_PUBLIC_AUTH_API_STOCK_DOMAIN ?? "http://localhost:3010",
    color: "#006c49",
    description: "Gestion des stocks et inventaires",
  },
];

const s = (fontSize: number) => ({ fontSize });

export const WORKSPACE_SHELL: AppShellConfig = {
  appName: "Workspace",
  appHref: "/",
  routeLabels: {
    "/":           "Accueil",
    "/projects":   "Projets",
    "/members":    "Membres",
    "/inbox":      "Inbox",
    "/audit-logs": "Journal d'activité",
    "/settings":   "Paramètres",
    "/help":       "Aide",
    "/apps":       "Applications",
    "/preferences":"Préférences",
  },
  routeIcons: {
    "/":           <HomeOutlined style={s(15)} />,
    "/projects":   <FolderOpenOutlined style={s(15)} />,
    "/members":    <GroupOutlined style={s(15)} />,
    "/inbox":      <InboxOutlined style={s(15)} />,
    "/audit-logs": <HistoryOutlined style={s(15)} />,
    "/settings":   <SettingsOutlined style={s(15)} />,
    "/help":       <HelpOutlineOutlined style={s(15)} />,
  },
};

export const HOSTO_SHELL: AppShellConfig = {
  appName: "Hosto",
  appHref: "/",
  routeLabels: {
    "/patients":      "Patients",
    "/services":      "Services",
    "/staff":         "Personnel",
    "/reception":     "Réception",
    "/consultations": "Consultations",
    "/calendar":      "Calendrier",
    "/schedules":     "Horaires",
    "/lab":           "Laboratoire",
  },
  routeIcons: {
    "/patients":      <PeopleAltOutlined style={s(15)} />,
    "/services":      <LocalHospitalOutlined style={s(15)} />,
    "/staff":         <MedicalServicesOutlined style={s(15)} />,
    "/reception":     <SensorDoorOutlined style={s(15)} />,
    "/consultations": <MedicalInformationOutlined style={s(15)} />,
    "/calendar":      <CalendarMonthOutlined style={s(15)} />,
    "/schedules":     <ScheduleOutlined style={s(15)} />,
    "/lab":           <BiotechOutlined style={s(15)} />,
  },
};

export const STOCK_SHELL: AppShellConfig = {
  appName: "Stock",
  appHref: "/",
  routeLabels: {
    "/items":      "Articles",
    "/categories": "Catégories",
  },
  routeIcons: {
    "/items":      <Inventory2Outlined style={s(15)} />,
    "/categories": <CategoryOutlined style={s(15)} />,
  },
};

export const TIERS_SHELL: AppShellConfig = {
  appName: "Tiers",
  appHref: "/tiers",
  routeLabels: {
    "/tiers": "Tiers",
  },
  routeIcons: {
    "/tiers": <GroupsOutlined style={s(15)} />,
  },
};
