import type { ReactNode } from "react";
import { InventoryOutlined, NotesOutlined, ViewListOutlined } from "@mui/icons-material";
import {
  DELIVERABLES_MODE_LABELS,
  DELIVERABLES_MODE_ORDER,
  deliverablesMode,
  type Phase,
} from "@/app/lib/projects-api";

export interface PhaseSection {
  key: string;
  /** Suffixe d'URL sous /projects/[id]/phases/[phaseId] — "" pour l'aperçu. */
  path: string;
  label: string;
  icon: ReactNode;
  /** Section annoncée mais pas encore livrée : onglet grisé, non cliquable. */
  soon?: boolean;
}

/** Outils activables depuis « Outils ». Un outil est soit un interrupteur, soit un
 *  choix de mode — même forme que le catalogue backend. */
export type PhaseToolSpec =
  | { key: string; kind: "toggle"; label: string; description: string }
  | {
      key: string;
      kind: "choice";
      label: string;
      description: string;
      options: { value: string; label: string }[];
      off: string;
    };

export const PHASE_TOOLS: PhaseToolSpec[] = [
  {
    key: "work_items",
    kind: "toggle",
    label: "Éléments de travail",
    description: "Ouvre l'onglet Tâches : la phase peut porter des éléments à réaliser, assignables et suivis.",
  },
  {
    key: "deliverables",
    kind: "choice",
    label: "Livrables",
    description:
      "Ouvre l'onglet Livrables et choisit à quoi un livrable se rattache : à la phase, à une tâche, ou aux deux.",
    options: DELIVERABLES_MODE_ORDER.map((value) => ({ value, label: DELIVERABLES_MODE_LABELS[value] })),
    off: "NONE",
  },
];

const OVERVIEW: PhaseSection = {
  key: "overview",
  path: "",
  label: "Aperçu",
  icon: <NotesOutlined style={{ fontSize: 17 }} />,
};

const TASKS_SECTION: PhaseSection = {
  key: "tasks",
  path: "/tasks",
  label: "Tâches",
  icon: <ViewListOutlined style={{ fontSize: 17 }} />,
};

const DELIVERABLES_SECTION: PhaseSection = {
  key: "deliverables",
  path: "/deliverables",
  label: "Livrables",
  icon: <InventoryOutlined style={{ fontSize: 17 }} />,
};

/** Onglets d'une phase = l'aperçu, plus ceux ouverts par ses outils. Point d'entrée
 *  du futur régime de travail : le régime choisira le jeu d'outils par défaut, la
 *  résolution des onglets ne bouge pas. */
export function phaseSectionsFor(phase: Phase): PhaseSection[] {
  const sections = [OVERVIEW];
  if (phase.tools?.work_items === true) sections.push(TASKS_SECTION);
  // Même en mode « sur tâche uniquement », la phase garde l'onglet : c'est là qu'on
  // voit l'ensemble de ses livrables, quelle que soit la tâche qui les porte.
  if (deliverablesMode(phase) !== "NONE") sections.push(DELIVERABLES_SECTION);
  return sections;
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
