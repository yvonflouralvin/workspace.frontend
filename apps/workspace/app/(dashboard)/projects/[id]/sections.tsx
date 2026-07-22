import type { ReactNode } from "react";
import {
  NotesOutlined,
  ViewKanbanOutlined,
  ViewListOutlined,
  DescriptionOutlined,
  TimelineOutlined,
} from "@mui/icons-material";

export interface ProjectSection {
  key: string;
  /** Suffixe d'URL sous /projects/[id] — "" pour l'aperçu. */
  path: string;
  label: string;
  icon: ReactNode;
  /** Section annoncée mais pas encore livrée : onglet grisé, non cliquable. */
  soon?: boolean;
}

// Ajouter une section = une entrée ici + le dossier de route correspondant.
export const PROJECT_SECTIONS: ProjectSection[] = [
  { key: "overview", path: "", label: "Aperçu", icon: <NotesOutlined style={{ fontSize: 17 }} /> },
  { key: "board", path: "/board", label: "Board", icon: <ViewKanbanOutlined style={{ fontSize: 17 }} /> },
  { key: "tasks", path: "/tasks", label: "Tâches", icon: <ViewListOutlined style={{ fontSize: 17 }} /> },
  {
    key: "documents",
    path: "/documents",
    label: "Documents",
    icon: <DescriptionOutlined style={{ fontSize: 17 }} />,
    soon: true,
  },
  {
    key: "timeline",
    path: "/timeline",
    label: "Échéancier",
    icon: <TimelineOutlined style={{ fontSize: 17 }} />,
    soon: true,
  },
];

export function sectionForPathname(pathname: string, projectId: number): ProjectSection {
  const suffix = pathname.replace(`/projects/${projectId}`, "").replace(/\/$/, "");
  return PROJECT_SECTIONS.find((s) => s.path === suffix) ?? PROJECT_SECTIONS[0]!;
}
