"use client";

import { createContext, useContext, type Dispatch, type SetStateAction } from "react";
import type { Phase, Project, ProjectRole, Task } from "@/app/lib/projects-api";

export interface Member {
  id: number;
  name: string;
}

export interface ProjectContextValue {
  projectId: number;
  project: Project;
  setProject: Dispatch<SetStateAction<Project | null>>;
  tasks: Task[];
  setTasks: Dispatch<SetStateAction<Task[]>>;
  reloadTasks: () => Promise<void>;
  phases: Phase[];
  reloadPhases: () => Promise<void>;
  members: Member[];
  /** Rôle de l'utilisateur sur CE projet. */
  role: ProjectRole;
  /** Peut écrire (phases, tâches) — MEMBER ou OWNER. */
  canManage: boolean;
  /** Peut administrer le projet (membres, outils, paramètres) — OWNER seul. */
  isOwner: boolean;
}

const ProjectContext = createContext<ProjectContextValue | null>(null);

export const ProjectProvider = ProjectContext.Provider;

export function useProject(): ProjectContextValue {
  const value = useContext(ProjectContext);
  if (!value) throw new Error("useProject doit être utilisé dans le layout d'un projet");
  return value;
}
