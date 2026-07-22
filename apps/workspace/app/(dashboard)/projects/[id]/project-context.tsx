"use client";

import { createContext, useContext, type Dispatch, type SetStateAction } from "react";
import type { Project, Task } from "@/app/lib/projects-api";

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
  members: Member[];
  canManage: boolean;
}

const ProjectContext = createContext<ProjectContextValue | null>(null);

export const ProjectProvider = ProjectContext.Provider;

export function useProject(): ProjectContextValue {
  const value = useContext(ProjectContext);
  if (!value) throw new Error("useProject doit être utilisé dans le layout d'un projet");
  return value;
}
