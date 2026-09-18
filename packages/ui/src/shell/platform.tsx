import React from "react";
import {
  HomeOutlined,
  SpaceDashboardOutlined,
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
  AssignmentTurnedInOutlined,
  AccountTreeOutlined,
  OutboxOutlined,
  DescriptionOutlined,
  ShoppingCartOutlined,
  ReceiptLongOutlined,
  SyncOutlined,
  QueryStatsOutlined,
  PlaceOutlined,
  EventOutlined,
  StorageOutlined,
  WidgetsOutlined,
  WorkOutlineOutlined,
  HomeWorkOutlined,
  LanguageOutlined,
  PhotoLibraryOutlined,
  MenuBookOutlined,
  AccountBalanceOutlined,
  AssessmentOutlined,
  GavelOutlined,
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
    id: "operations",
    name: "Operations",
    icon: "O",
    url: process.env.NEXT_PUBLIC_AUTH_API_OPERATIONS_DOMAIN ?? "http://localhost:3013",
    color: "#0f766e",
    description: "Planification des prestations, espaces, matériels et véhicules",
  },
  {
    id: "academique",
    name: "Academia",
    icon: "A",
    url: process.env.NEXT_PUBLIC_AUTH_API_ACADEMIQUE_DOMAIN ?? "http://localhost:3015",
    color: "#1d4ed8",
    description: "Structure académique, années, étudiants et inscriptions",
  },
  {
    id: "isp",
    name: "ISP",
    icon: "I",
    url: process.env.NEXT_PUBLIC_AUTH_API_ISP_DOMAIN ?? "http://localhost:3016",
    color: "#0e7490",
    description: "Stages, mémoires et projets tutorés",
  },
  {
    id: "website",
    name: "Website",
    icon: "W",
    url: process.env.NEXT_PUBLIC_AUTH_API_WEBSITE_DOMAIN ?? "http://localhost:3017",
    color: "#0d9488",
    description: "Construire et publier le site web de l'organisation",
  },
  {
    id: "sgr",
    name: "SGR",
    icon: "S",
    url: process.env.NEXT_PUBLIC_AUTH_API_SGR_DOMAIN ?? "http://localhost:3014",
    color: "#7c2d12",
    description: "Secrétariat Général à la Recherche — dossiers de troisième cycle",
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
  {
    id: "audit_missions",
    name: "Audit",
    icon: "A",
    url: process.env.NEXT_PUBLIC_AUTH_API_AUDIT_MISSIONS_DOMAIN ?? "http://localhost:3019",
    color: "#78350f",
    description: "Missions d'audit — checklists de contrôle et anomalies",
  },
  {
    id: "comptabilite",
    name: "Comptabilité",
    icon: "C",
    url: process.env.NEXT_PUBLIC_AUTH_API_COMPTABILITE_DOMAIN ?? "http://localhost:3020",
    color: "#1e3a8a",
    description: "Comptabilité générale OHADA — écritures, grand livre, états financiers",
  },
  {
    id: "business_firm_missions",
    name: "Business Firm Mission",
    icon: "B",
    url: process.env.NEXT_PUBLIC_AUTH_API_BUSINESS_FIRM_MISSIONS_DOMAIN ?? "http://localhost:3021",
    color: "#7c2d12",
    description: "Suivi des missions et prestations pour les clients — clients, missions, audit, fiscal",
  },
];

/** Le sélecteur d'apps de chaque écran : une permission `.access` ne suffit
 *  pas, l'app doit aussi être active pour CE workspace — sinon un groupe qui
 *  porte encore la permission d'une app désactivée depuis la boutique
 *  continue de la voir dans le sélecteur. `appsActifs` vient de
 *  `session.active_workspace.apps_actifs` ; `undefined` (session pas encore
 *  chargée) rend une liste vide plutôt que de retomber sur la permission
 *  seule, qui rouvrirait le trou pendant le chargement. */
export function appsAutorisees(
  can: (permission: string) => boolean,
  appsActifs: string[] | undefined,
): AppDefinition[] {
  const actifs = new Set(appsActifs ?? []);
  return PLATFORM_APPS.filter((app) => actifs.has(app.id) && can(`${app.id}.access`));
}

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
    "/tableau-de-bord": "Tableau de bord",
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
    "/tableau-de-bord": <SpaceDashboardOutlined style={s(15)} />,
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

export const ACADEMIQUE_SHELL: AppShellConfig = {
  appName: "Academia",
  appHref: "/",
  appIcon: "A",
  appColor: "#1d4ed8",
  routeLabels: {
    "/structure": "Structure",
    "/annees": "Années",
    "/promotions": "Promotions",
    "/etudiants": "Étudiants",
    "/enseignants": "Enseignants",
  },
  routeIcons: {
    "/structure": <AccountTreeOutlined style={s(15)} />,
    "/annees": <EventOutlined style={s(15)} />,
    "/etudiants": <GroupsOutlined style={s(15)} />,
  },
};

export const WEBSITE_SHELL: AppShellConfig = {
  appName: "Website",
  appHref: "/",
  appIcon: "W",
  appColor: "#0d9488",
  routeLabels: {
    "/sites": "Sites",
    "/medias": "Médias",
    "/domaines": "Domaines",
    "/parametres": "Paramètres",
  },
  routeIcons: {
    "/sites": <LanguageOutlined style={s(15)} />,
    "/medias": <PhotoLibraryOutlined style={s(15)} />,
  },
};

export const ISP_SHELL: AppShellConfig = {
  appName: "ISP",
  appHref: "/",
  appIcon: "I",
  appColor: "#0e7490",
  routeLabels: {
    "/memoires": "Mémoires",
    "/projets": "Projets tutorés",
    "/stages": "Stages",
    "/depots": "Dépôts de mémoire",
    "/referentiel": "Référentiel",
  },
  routeIcons: {
    "/memoires": <DescriptionOutlined style={s(15)} />,
    "/projets": <GroupsOutlined style={s(15)} />,
    "/stages": <WorkOutlineOutlined style={s(15)} />,
    "/depots": <HomeWorkOutlined style={s(15)} />,
  },
};

export const SGR_SHELL: AppShellConfig = {
  appName: "SGR",
  appHref: "/",
  appIcon: "S",
  appColor: "#7c2d12",
  routeLabels: {
    "/mon-dossier": "Mon dossier",
    "/dossiers": "Dossiers",
    "/rendez-vous": "Rendez-vous",
    "/parametres": "Paramètres",
  },
  routeIcons: {
    "/mon-dossier": <DescriptionOutlined style={s(15)} />,
    "/dossiers": <FolderOpenOutlined style={s(15)} />,
    "/rendez-vous": <EventOutlined style={s(15)} />,
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

export const AUDIT_MISSIONS_SHELL: AppShellConfig = {
  appName: "Audit",
  appHref: "/missions",
  appIcon: "A",
  appColor: "#78350f",
  routeLabels: {
    "/missions": "Missions",
  },
  routeIcons: {
    "/missions": <WorkOutlineOutlined style={s(15)} />,
  },
};

export const COMPTABILITE_SHELL: AppShellConfig = {
  appName: "Comptabilité",
  appHref: "/ecritures",
  appIcon: "C",
  appColor: "#1e3a8a",
  routeLabels: {
    "/ecritures": "Écritures",
    "/comptes": "Plan comptable",
    "/journaux": "Journaux",
    "/exercices": "Exercices",
    "/grand-livre": "Grand livre",
    "/balance": "Balance",
    "/etats": "États financiers",
    "/taxes": "Taxes",
  },
  routeIcons: {
    "/ecritures": <MenuBookOutlined style={s(15)} />,
    "/comptes": <AccountBalanceOutlined style={s(15)} />,
    "/etats": <AssessmentOutlined style={s(15)} />,
  },
};

export const BUSINESS_FIRM_MISSIONS_SHELL: AppShellConfig = {
  appName: "Business Firm Mission",
  appHref: "/clients",
  appIcon: "B",
  appColor: "#7c2d12",
  routeLabels: {
    "/clients": "Clients",
    "/missions": "Missions",
    "/audit": "Audit",
    "/fiscal": "Assistance fiscale",
  },
  routeIcons: {
    "/clients": <PeopleAltOutlined style={s(15)} />,
    "/missions": <AssignmentTurnedInOutlined style={s(15)} />,
    "/audit": <GavelOutlined style={s(15)} />,
    "/fiscal": <ReceiptLongOutlined style={s(15)} />,
  },
};

export const OPERATIONS_SHELL: AppShellConfig = {
  appName: "Operations",
  appHref: "/",
  appIcon: "O",
  appColor: "#0f766e",
  routeLabels: {
    "/plannings":  "Plannings",
    "/salles":     "Salles",
    "/parametres": "Paramètres",
  },
  routeIcons: {
    "/plannings": <EventOutlined style={s(15)} />,
    "/salles":    <PlaceOutlined style={s(15)} />,
  },
};

export const HR_SHELL: AppShellConfig = {
  appName: "RH",
  appHref: "/",
  appIcon: "H",
  appColor: "#006c49",
  routeLabels: {
    "/employees":    "Employés",
    "/groups":       "Organigramme",
  },
  routeIcons: {
    "/employees":    <PeopleAltOutlined style={s(15)} />,
    "/groups":       <AccountTreeOutlined style={s(15)} />,
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
