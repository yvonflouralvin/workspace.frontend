import type { ReactNode } from "react";
import {
  AccountTreeOutlined,
  FolderOpenOutlined,
  NotesOutlined,
  SettingsOutlined,
  ViewListOutlined,
} from "@mui/icons-material";

export interface MissionSection {
  key: string;
  /** Suffixe d'URL sous /missions/[id] — "" pour l'aperçu. */
  path: string;
  label: string;
  icon: ReactNode;
}

// Ajouter une section = une entrée ici + le dossier de route correspondant.
export const MISSION_SECTIONS: MissionSection[] = [
  { key: "apercu", path: "", label: "Aperçu", icon: <NotesOutlined style={{ fontSize: 17 }} /> },
  { key: "phases", path: "/phases", label: "Phases", icon: <AccountTreeOutlined style={{ fontSize: 17 }} /> },
  // Les tâches et les documents de TOUTES les phases, sans descendre phase par phase.
  { key: "taches", path: "/taches", label: "Tâches", icon: <ViewListOutlined style={{ fontSize: 17 }} /> },
  { key: "documents", path: "/documents", label: "Documents", icon: <FolderOpenOutlined style={{ fontSize: 17 }} /> },
  { key: "parametres", path: "/parametres", label: "Paramètres", icon: <SettingsOutlined style={{ fontSize: 17 }} /> },
];

function suffixe(pathname: string, missionId: number): string {
  return pathname.replace(`/missions/${missionId}`, "").replace(/\/$/, "");
}

/** Le détail d'une phase porte sa propre identité (mission en surtitre, phase en
 *  titre) et ses propres onglets — le layout de la mission s'efface au profit du sien. */
export function isPhaseDetailPathname(pathname: string, missionId: number): boolean {
  return /^\/phases\/\d+/.test(suffixe(pathname, missionId));
}

export function sectionForPathname(pathname: string, missionId: number): MissionSection {
  const s = suffixe(pathname, missionId);
  // « /parametres/collaborateurs » active encore l'onglet Paramètres.
  return (
    MISSION_SECTIONS.find((x) => x.path !== "" && (s === x.path || s.startsWith(`${x.path}/`))) ??
    MISSION_SECTIONS[0]!
  );
}
