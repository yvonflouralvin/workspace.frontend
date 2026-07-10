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
  FolderOutlined,
  FactCheckOutlined,
  AssignmentTurnedInOutlined,
  AccountTreeOutlined,
  OutboxOutlined,
  DescriptionOutlined,
  ShoppingCartOutlined,
  ReceiptLongOutlined,
  SyncOutlined,
  QueryStatsOutlined,
  StorageOutlined,
  WidgetsOutlined,
} from "@mui/icons-material";
import type { AppDefinition } from "../types/shell";

export interface AppShellConfig {
  appName: string;
  appHref: string;
  appIcon?: string;
  appColor?: string;
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
  {
    id: "documents",
    name: "Documents",
    icon: "D",
    url: process.env.NEXT_PUBLIC_AUTH_API_DOCUMENTS_DOMAIN ?? "http://localhost:3008",
    color: "#7c3aed",
    description: "Modèles et génération de documents PDF",
  },
  {
    id: "ventes",
    name: "Facturation",
    icon: "F",
    url: process.env.NEXT_PUBLIC_AUTH_API_VENTES_DOMAIN ?? "http://localhost:3011",
    color: "#e11d48",
    description: "Facturation",
  },
  {
    id: "dashboard",
    name: "Tableau de bord",
    icon: "R",
    url: process.env.NEXT_PUBLIC_AUTH_API_DASHBOARD_DOMAIN ?? "http://localhost:3012",
    color: "#0891b2",
    description: "Rapports temps réel agrégés des applications",
  },
];

const s = (fontSize: number) => ({ fontSize });

export const WORKSPACE_SHELL: AppShellConfig = {
  appName: "Workspace",
  appHref: "/",
  appIcon: "W",
  appColor: "#3525cd",
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
  appIcon: "P",
  appColor: "#0e7490",
  routeLabels: {
    "/patients":      "Patients",
    "/services":      "Services",
    "/staff":         "Personnel",
    "/reception":     "Réception",
    "/consultations": "Consultations",
    "/calendar":      "Calendrier",
    "/schedules":     "Horaires",
    "/lab":           "Laboratoire",
    "/parametres":            "Paramètres",
    "/parametres/synchro":    "Synchronisation",
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
    "/parametres":            <SettingsOutlined style={s(15)} />,
    "/parametres/synchro":    <SyncOutlined style={s(15)} />,
  },
};

export const STOCK_SHELL: AppShellConfig = {
  appName: "Stock",
  appHref: "/",
  appIcon: "S",
  appColor: "#006c49",
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
  appIcon: "T",
  appColor: "#b45309",
  routeLabels: {
    "/tiers": "Tiers",
  },
  routeIcons: {
    "/tiers": <GroupsOutlined style={s(15)} />,
  },
};

export const HR_SHELL: AppShellConfig = {
  appName: "RH",
  appHref: "/",
  appIcon: "H",
  appColor: "#006c49",
  routeLabels: {
    "/employees":    "Employés",
    "/groups":       "Groupes/Départements",
    "/demo-approval":"Démo approbation",
  },
  routeIcons: {
    "/employees":    <PeopleAltOutlined style={s(15)} />,
    "/groups":       <FolderOutlined style={s(15)} />,
    "/demo-approval":<FactCheckOutlined style={s(15)} />,
  },
};

export const APPROVAL_FLOWS_SHELL: AppShellConfig = {
  appName: "Workflows d'approbation",
  appHref: "/",
  appIcon: "A",
  appColor: "#004598",
  routeLabels: {
    "/requests":    "Requests",
    "/flows":       "Flows",
    "/submissions": "Submission",
  },
  routeIcons: {
    "/requests":    <AssignmentTurnedInOutlined style={s(15)} />,
    "/flows":       <AccountTreeOutlined style={s(15)} />,
    "/submissions": <OutboxOutlined style={s(15)} />,
  },
};

export const VENTES_SHELL: AppShellConfig = {
  appName: "Facturation",
  appHref: "/clients",
  appIcon: "F",
  appColor: "#e11d48",
  routeLabels: {
    "/clients":    "Clients",
    "/produits":   "Produits",
    "/commandes":  "Commandes",
    "/factures":   "Factures",
    "/parametres": "Paramètres",
  },
  routeIcons: {
    "/clients":    <PeopleAltOutlined style={s(15)} />,
    "/produits":   <Inventory2Outlined style={s(15)} />,
    "/commandes":  <ShoppingCartOutlined style={s(15)} />,
    "/factures":   <ReceiptLongOutlined style={s(15)} />,
    "/parametres": <SettingsOutlined style={s(15)} />,
  },
};

export const DASHBOARD_SHELL: AppShellConfig = {
  appName: "Tableau de bord",
  appHref: "/",
  appIcon: "R",
  appColor: "#0891b2",
  routeLabels: {
    "/": "Rapports",
    "/widgets": "Widgets",
    "/sources": "Sources de données",
  },
  routeIcons: {
    "/": <QueryStatsOutlined style={s(15)} />,
    "/widgets": <WidgetsOutlined style={s(15)} />,
    "/sources": <StorageOutlined style={s(15)} />,
  },
};

export const DOCUMENTS_SHELL: AppShellConfig = {
  appName: "Documents",
  appHref: "/",
  appIcon: "D",
  appColor: "#7c3aed",
  routeLabels: {
    "/": "Templates PDF",
  },
  routeIcons: {
    "/": <DescriptionOutlined style={s(15)} />,
  },
};
