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

const BASE_SECTIONS: PhaseSection[] = [
  { key: "overview", path: "", label: "Aperçu", icon: <NotesOutlined style={{ fontSize: 17 }} /> },
  {
    key: "tasks",
    path: "/tasks",
    label: "Éléments",
    icon: <ViewListOutlined style={{ fontSize: 17 }} />,
    soon: true,
  },
];

/** Onglets d'une phase. Point d'entrée du futur « régime de travail » : le régime
 *  porté par la phase choisira ici son jeu d'onglets (un régime chantier n'expose
 *  pas les mêmes écrans qu'un régime étude), sans toucher au layout. */
export function phaseSectionsFor(_phase: Phase): PhaseSection[] {
  return BASE_SECTIONS;
}

export function phaseSectionForPathname(
  pathname: string,
  projectId: number,
  phaseId: number,
  sections: PhaseSection[]
): PhaseSection {
  const suffix = pathname
    .replace(`/projects/${projectId}/phases/${phaseId}`, "")
    .replace(/\/$/, "");
  return sections.find((s) => s.path === suffix) ?? sections[0]!;
}
