import type { ReactNode } from "react";
import { NotesOutlined, ViewListOutlined } from "@mui/icons-material";
import type { Phase } from "@/app/lib/projects-api";

export interface PhaseSection {
  key: string;
  /** Suffixe d'URL sous /projects/[id]/phases/[phaseId] — "" pour l'aperçu. */
  path: string;
  label: string;
  icon: ReactNode;
  /** Section annoncée mais pas encore livrée : onglet grisé, non cliquable. */
  soon?: boolean;
}

/** Outils activables depuis « Outils » — chacun ouvre son ou ses onglets. */
export const PHASE_TOOLS = [
  {
    key: "work_items",
    label: "Éléments de travail",
    description: "Ouvre l'onglet Tâches : la phase peut porter des éléments à réaliser, assignables et suivis.",
  },
] as const;

const OVERVIEW: PhaseSection = {
  key: "overview",
  path: "",
  label: "Aperçu",
  icon: <NotesOutlined style={{ fontSize: 17 }} />,
};

const TOOL_SECTIONS: Record<string, PhaseSection[]> = {
  work_items: [
    { key: "tasks", path: "/tasks", label: "Tâches", icon: <ViewListOutlined style={{ fontSize: 17 }} /> },
  ],
};

/** Onglets d'une phase = l'aperçu, plus ceux ouverts par ses outils. Point d'entrée
 *  du futur régime de travail : le régime choisira le jeu d'outils par défaut, la
 *  résolution des onglets ne bouge pas. */
export function phaseSectionsFor(phase: Phase): PhaseSection[] {
  const enabled = phase.tools ?? [];
  return [OVERVIEW, ...enabled.flatMap((tool) => TOOL_SECTIONS[tool] ?? [])];
}

/** Section active pour une URL. Les pages hors onglets (Outils) n'en activent aucun. */
export function phaseSectionForPathname(
  pathname: string,
  projectId: number,
  phaseId: number,
  sections: PhaseSection[]
): PhaseSection | null {
  const suffix = pathname
    .replace(`/projects/${projectId}/phases/${phaseId}`, "")
    .replace(/\/$/, "");
  return sections.find((s) => s.path === suffix) ?? null;
}
