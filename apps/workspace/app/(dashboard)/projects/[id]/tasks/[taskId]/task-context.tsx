"use client";

import { createContext, useContext } from "react";
import type { Phase, Task } from "@/app/lib/projects-api";

export type TaskSaveState = "idle" | "saving" | "saved" | "error";

export interface TaskContextValue {
  task: Task;
  /** Phase porteuse — elle décide des outils ouverts sur la tâche. */
  phase: Phase | null;
  /** Empile un patch et déclenche la sauvegarde différée (partagée avec l'en-tête). */
  queue: (patch: Partial<Task>) => void;
  saveState: TaskSaveState;
  canManage: boolean;
}

const TaskContext = createContext<TaskContextValue | null>(null);

export const TaskProvider = TaskContext.Provider;

export function useTask(): TaskContextValue {
  const value = useContext(TaskContext);
  if (!value) throw new Error("useTask doit être utilisé dans le layout d'une tâche");
  return value;
}
