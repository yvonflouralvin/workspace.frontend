import { apiFetch } from "@repo/network/client";

export interface Project {
  id: number;
  name: string;
  key: string;
  description: string | null;
  color: string | null;
  icon: string | null;
  status: string;
  lead_user_id: number | null;
  start_date: string | null;
  due_date: string | null;
  task_count?: number;
  done_count?: number;
}

export interface Task {
  id: number;
  project_id: number;
  number: number;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  assignee_user_id: number | null;
  assignee_name: string | null;
  parent_task_id: number | null;
  order: number;
  start_date: string | null;
  due_date: string | null;
  estimate: number | null;
  completed_at: string | null;
  project_name?: string | null;
  project_key?: string | null;
}

export interface MetaOption { key: string; label: string }
export interface ProjectsMeta { statuses: MetaOption[]; priorities: MetaOption[] }

async function json<T>(res: Response): Promise<T> {
  if (!res.ok) throw new Error((await res.json().catch(() => ({})))?.detail || `Erreur ${res.status}`);
  return res.status === 204 ? (undefined as T) : res.json();
}

export const projectsApi = {
  meta: () => apiFetch("/api/projects/meta").then((r) => json<ProjectsMeta>(r)),

  listProjects: (includeArchived = false) =>
    apiFetch(`/api/projects${includeArchived ? "?include_archived=true" : ""}`).then((r) => json<Project[]>(r)),
  getProject: (id: number) => apiFetch(`/api/projects/${id}`).then((r) => json<Project>(r)),
  createProject: (body: Partial<Project>) => apiFetch("/api/projects", { method: "POST", body }).then((r) => json<Project>(r)),
  updateProject: (id: number, body: Partial<Project>) => apiFetch(`/api/projects/${id}`, { method: "PATCH", body }).then((r) => json<Project>(r)),
  archiveProject: (id: number) => apiFetch(`/api/projects/${id}`, { method: "DELETE" }).then((r) => json<void>(r)),

  listTasks: (projectId: number) => apiFetch(`/api/projects/${projectId}/tasks`).then((r) => json<Task[]>(r)),
  myTasks: (includeDone = false) => apiFetch(`/api/tasks/mine${includeDone ? "?include_done=true" : ""}`).then((r) => json<Task[]>(r)),
  createTask: (body: Partial<Task> & { project_id: number; title: string }) => apiFetch("/api/tasks", { method: "POST", body }).then((r) => json<Task>(r)),
  updateTask: (id: number, body: Partial<Task>) => apiFetch(`/api/tasks/${id}`, { method: "PATCH", body }).then((r) => json<Task>(r)),
  deleteTask: (id: number) => apiFetch(`/api/tasks/${id}`, { method: "DELETE" }).then((r) => json<void>(r)),
};

export const STATUS_LABELS: Record<string, string> = {
  BACKLOG: "Backlog", A_FAIRE: "À faire", EN_COURS: "En cours", EN_REVUE: "En revue", TERMINE: "Terminé",
};
export const STATUS_ORDER = ["BACKLOG", "A_FAIRE", "EN_COURS", "EN_REVUE", "TERMINE"];
export const PRIORITY_LABELS: Record<string, string> = {
  AUCUNE: "Aucune", BASSE: "Basse", MOYENNE: "Moyenne", HAUTE: "Haute", URGENTE: "Urgente",
};
export const PRIORITY_ORDER = ["AUCUNE", "BASSE", "MOYENNE", "HAUTE", "URGENTE"];
export function priorityTone(p: string): string {
  if (p === "URGENTE") return "text-error";
  if (p === "HAUTE") return "text-tertiary";
  return "text-on-surface-variant";
}
