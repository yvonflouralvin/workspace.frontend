import type { ReactNode } from "react";
import { NotesOutlined, ViewListOutlined } from "@mui/icons-material";

export interface PhaseSection {
  key: string;
  /** Suffixe d'URL sous /missions/[id]/phases/[phaseId] — "" pour l'aperçu. */
  path: string;
  label: string;
  icon: ReactNode;
}

export const PHASE_SECTIONS: PhaseSection[] = [
  { key: "apercu", path: "", label: "Aperçu", icon: <NotesOutlined style={{ fontSize: 17 }} /> },
  { key: "taches", path: "/taches", label: "Tâches", icon: <ViewListOutlined style={{ fontSize: 17 }} /> },
];

export function phaseSectionForPathname(pathname: string, missionId: number, phaseId: number): PhaseSection {
  const suffix = pathname.replace(`/missions/${missionId}/phases/${phaseId}`, "").replace(/\/$/, "");
  return PHASE_SECTIONS.find((s) => s.path === suffix) ?? PHASE_SECTIONS[0]!;
}
