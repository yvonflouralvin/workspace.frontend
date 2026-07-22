import type { ReactNode } from "react";
import { NotesOutlined, ViewKanbanOutlined, ViewListOutlined } from "@mui/icons-material";

export interface ProjectSection {
  key: string;
  /** Suffixe d'URL sous /projects/[id] — "" pour l'aperçu. */
  path: string;
  label: string;
  icon: ReactNode;
}

// Ajouter une section = une entrée ici + le dossier de route correspondant.
export const PROJECT_SECTIONS: ProjectSection[] = [
  { key: "overview", path: "", label: "Aperçu", icon: <NotesOutlined style={{ fontSize: 18 }} /> },
  { key: "board", path: "/board", label: "Board", icon: <ViewKanbanOutlined style={{ fontSize: 18 }} /> },
  { key: "tasks", path: "/tasks", label: "Tâches", icon: <ViewListOutlined style={{ fontSize: 18 }} /> },
];

export function sectionForPathname(pathname: string, projectId: number): ProjectSection {
  const suffix = pathname.replace(`/projects/${projectId}`, "").replace(/\/$/, "");
  return PROJECT_SECTIONS.find((s) => s.path === suffix) ?? PROJECT_SECTIONS[0]!;
}
