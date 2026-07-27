import { apiFetch } from "@repo/network/client";

/** RBAC local au projet, en plus du RBAC workspace. */
export type ProjectRole = "OWNER" | "MEMBER" | "VIEWER";

export const PROJECT_ROLE_LABELS: Record<ProjectRole, string> = {
  OWNER: "Propriétaire",
  MEMBER: "Membre",
  VIEWER: "Lecteur",
};
export const PROJECT_ROLE_HINTS: Record<ProjectRole, string> = {
  OWNER: "Gère les membres, les outils et les paramètres du projet.",
  MEMBER: "Crée et modifie phases et tâches.",
  VIEWER: "Consulte le projet sans jamais rien modifier.",
};
export const PROJECT_ROLE_ORDER: ProjectRole[] = ["OWNER", "MEMBER", "VIEWER"];

export interface ProjectMember {
  id: number;
  project_id: number;
  user_id: number;
  role: ProjectRole;
  user_name: string | null;
  created_at: string;
}

/** Droits fins par groupe — mode RESTRICTIF : appartenir à un groupe réduit le
 *  périmètre aux objets portant les tags de ses règles. */
export type RuleScope = "phase" | "task";
export type RuleAccess = "READ" | "WRITE" | "DELETE";

export const RULE_SCOPE_LABELS: Record<RuleScope, string> = { phase: "Phase", task: "Tâche" };
export const RULE_SCOPE_ORDER: RuleScope[] = ["phase", "task"];
export const RULE_ACCESS_LABELS: Record<RuleAccess, string> = {
  READ: "Lecture",
  WRITE: "Lecture / écriture",
  DELETE: "Lecture / écriture / suppression",
};
export const RULE_ACCESS_ORDER: RuleAccess[] = ["READ", "WRITE", "DELETE"];

export interface GroupRule {
  scope: RuleScope;
  tag: string;
  access: RuleAccess;
}

export interface ProjectGroup {
  id: number;
  project_id: number;
  name: string;
  user_ids: number[];
  user_names: Record<number, string>;
  rules: GroupRule[];
  created_at: string;
}

export interface Project {
  id: number;
  name: string;
  key: string;
  description: string | null;
  /** Document BlockNote sérialisé ; `description` en est le texte brut dérivé. */
  description_rich: string | null;
  color: string | null;
  icon: string | null;
  status: string;
  lead_user_id: number | null;
  start_date: string | null;
  due_date: string | null;
  task_count?: number;
  done_count?: number;
  /** Rôle de l'utilisateur courant sur ce projet — pilote toute l'UI. */
  my_role?: ProjectRole | null;
}

export interface Phase {
  id: number;
  workspace_id: number;
  project_id: number;
  name: string;
  description: string | null;
  /** Document BlockNote sérialisé ; `description` en est le texte brut dérivé. */
  description_rich: string | null;
  position: number;
  status: string;
  /** Affichage uniquement : phase auto-créée, masquée dans l'UI tant qu'elle est seule. */
  est_implicite: boolean;
  /** Outils activés sur la phase (map {clé: valeur}) — pilote les onglets ouverts. */
  tools: Record<string, boolean | string>;
  /** Étiquettes libres — base des droits fins par groupe. */
  tags: string[];
  start_planned: string | null;
  end_planned: string | null;
  start_real: string | null;
  end_real: string | null;
  task_count?: number;
}

export interface Task {
  id: number;
  project_id: number;
  phase_id: number;
  number: number;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  assignee_user_id: number | null;
  assignee_name: string | null;
  parent_task_id: number | null;
  tags: string[];
  order: number;
  start_date: string | null;
  due_date: string | null;
  estimate: number | null;
  completed_at: string | null;
  project_name?: string | null;
  project_key?: string | null;
}

/** Modes de l'outil Livrables : à quoi un livrable peut se rattacher. */
export type DeliverablesMode = "NONE" | "PHASE_TASK" | "PHASE" | "TASK";

export const DELIVERABLES_MODE_LABELS: Record<DeliverablesMode, string> = {
  NONE: "Aucun",
  PHASE_TASK: "Sur phase et tâche",
  PHASE: "Sur phase uniquement",
  TASK: "Sur tâche uniquement",
};
export const DELIVERABLES_MODE_ORDER: DeliverablesMode[] = ["NONE", "PHASE_TASK", "PHASE", "TASK"];

export function deliverablesMode(phase: Phase): DeliverablesMode {
  const value = phase.tools?.deliverables;
  return typeof value === "string" ? (value as DeliverablesMode) : "NONE";
}
export function deliverablesOnPhase(phase: Phase): boolean {
  return ["PHASE_TASK", "PHASE"].includes(deliverablesMode(phase));
}
export function deliverablesOnTask(phase: Phase): boolean {
  return ["PHASE_TASK", "TASK"].includes(deliverablesMode(phase));
}

export const DELIVERABLE_STATUS_LABELS: Record<string, string> = {
  A_PRODUIRE: "À produire", EN_COURS: "En cours", LIVRE: "Livré", ACCEPTE: "Accepté",
};
/** Ce qu'on attend concrètement — oriente la saisie d'une version. */
export type DeliverableType = "LIEN" | "FICHIER" | "DOCUMENT";
export const DELIVERABLE_TYPE_LABELS: Record<DeliverableType, string> = {
  LIEN: "Lien",
  FICHIER: "Fichier",
  DOCUMENT: "Document",
};
export const DELIVERABLE_TYPE_ORDER: DeliverableType[] = ["FICHIER", "LIEN", "DOCUMENT"];

export const DELIVERABLE_STATUS_ORDER = ["A_PRODUIRE", "EN_COURS", "LIVRE", "ACCEPTE"];
export const DELIVERABLE_STATUS_TONES: Record<string, { dot: string; chip: string }> = {
  A_PRODUIRE: { dot: "bg-status-backlog", chip: "bg-status-backlog-container text-status-backlog-on" },
  EN_COURS:   { dot: "bg-status-doing",   chip: "bg-status-doing-container text-status-doing" },
  LIVRE:      { dot: "bg-status-review",  chip: "bg-status-review-container text-status-review" },
  ACCEPTE:    { dot: "bg-status-done",    chip: "bg-status-done-container text-status-done" },
};

export interface Deliverable {
  id: number;
  project_id: number;
  phase_id: number;
  task_id: number | null;
  title: string;
  description: string | null;
  status: string;
  expected_type: DeliverableType;
  due_date: string | null;
  task_title: string | null;
  phase_name: string | null;
}

export const VERSION_STATUS_LABELS: Record<string, string> = {
  EN_ATTENTE: "En attente", APPROUVE: "Approuvée", REJETE: "Rejetée",
};
export const VERSION_STATUS_TONES: Record<string, { dot: string; chip: string }> = {
  EN_ATTENTE: { dot: "bg-status-doing",   chip: "bg-status-doing-container text-status-doing" },
  APPROUVE:   { dot: "bg-status-done",    chip: "bg-status-done-container text-status-done" },
  REJETE:     { dot: "bg-error",          chip: "bg-error-container text-on-error-container" },
};

export interface DeliverableVersion {
  id: number;
  deliverable_id: number;
  number: number;
  note: string | null;
  content_url: string | null;
  content_rich: string | null;
  document_id: number | null;
  file_name: string | null;
  file_size: number | null;
  status: string;
  submitted_by_name: string | null;
  submitted_at: string;
  decided_by_name: string | null;
  decided_at: string | null;
  decision_note: string | null;
}

export interface DeliverableApprovers {
  user_ids: number[];
  group_ids: number[];
  user_names: Record<number, string>;
  group_names: Record<number, string>;
  /** L'appelant peut-il décider du sort de la version en attente ? */
  can_approve: boolean;
}

export interface ProjectActivity {
  id: number;
  phase_id: number | null;
  task_id: number | null;
  deliverable_id: number | null;
  action: string;
  action_label: string | null;
  target_label: string | null;
  detail: string | null;
  actor_name: string | null;
  created_at: string;
}

export interface MetaOption { key: string; label: string }
export interface ProjectsMeta { statuses: MetaOption[]; priorities: MetaOption[]; phase_statuses: MetaOption[] }

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

  listPhases: (projectId: number) => apiFetch(`/api/projects/${projectId}/phases`).then((r) => json<Phase[]>(r)),
  createPhase: (projectId: number, body: Partial<Phase>) => apiFetch(`/api/projects/${projectId}/phases`, { method: "POST", body }).then((r) => json<Phase>(r)),
  updatePhase: (id: number, body: Partial<Phase>) => apiFetch(`/api/phases/${id}`, { method: "PATCH", body }).then((r) => json<Phase>(r)),
  listMembers: (projectId: number) =>
    apiFetch(`/api/projects/${projectId}/members`).then((r) => json<ProjectMember[]>(r)),
  addMember: (projectId: number, body: { user_id: number; role: ProjectRole }) =>
    apiFetch(`/api/projects/${projectId}/members`, { method: "POST", body }).then((r) => json<ProjectMember>(r)),
  updateMember: (projectId: number, userId: number, role: ProjectRole) =>
    apiFetch(`/api/projects/${projectId}/members/${userId}`, { method: "PATCH", body: { role } }).then((r) =>
      json<ProjectMember>(r)
    ),
  removeMember: (projectId: number, userId: number) =>
    apiFetch(`/api/projects/${projectId}/members/${userId}`, { method: "DELETE" }).then((r) => json<void>(r)),

  listGroups: (projectId: number) =>
    apiFetch(`/api/projects/${projectId}/groups`).then((r) => json<ProjectGroup[]>(r)),
  createGroup: (projectId: number, body: { name: string; user_ids?: number[]; rules?: GroupRule[] }) =>
    apiFetch(`/api/projects/${projectId}/groups`, { method: "POST", body }).then((r) => json<ProjectGroup>(r)),
  updateGroup: (
    projectId: number,
    groupId: number,
    body: { name?: string; user_ids?: number[]; rules?: GroupRule[] }
  ) =>
    apiFetch(`/api/projects/${projectId}/groups/${groupId}`, { method: "PATCH", body }).then((r) =>
      json<ProjectGroup>(r)
    ),
  deleteGroup: (projectId: number, groupId: number) =>
    apiFetch(`/api/projects/${projectId}/groups/${groupId}`, { method: "DELETE" }).then((r) => json<void>(r)),

  listProjectDeliverables: (projectId: number) =>
    apiFetch(`/api/projects/${projectId}/deliverables`).then((r) => json<Deliverable[]>(r)),
  listDeliverables: (phaseId: number) =>
    apiFetch(`/api/phases/${phaseId}/deliverables`).then((r) => json<Deliverable[]>(r)),
  createDeliverable: (phaseId: number, body: Partial<Deliverable> & { title: string }) =>
    apiFetch(`/api/phases/${phaseId}/deliverables`, { method: "POST", body }).then((r) => json<Deliverable>(r)),
  updateDeliverable: (id: number, body: Partial<Deliverable>) =>
    apiFetch(`/api/deliverables/${id}`, { method: "PATCH", body }).then((r) => json<Deliverable>(r)),
  listActivities: (projectId: number, limit = 50) =>
    apiFetch(`/api/projects/${projectId}/activities?limit=${limit}`).then((r) =>
      json<ProjectActivity[]>(r)
    ),

  getDeliverable: (id: number) =>
    apiFetch(`/api/deliverables/${id}`).then((r) => json<Deliverable>(r)),
  listVersions: (id: number) =>
    apiFetch(`/api/deliverables/${id}/versions`).then((r) => json<DeliverableVersion[]>(r)),
  submitVersion: (
    id: number,
    body: { note?: string | null; content_url?: string | null; content_rich?: string | null }
  ) => apiFetch(`/api/deliverables/${id}/versions`, { method: "POST", body }).then((r) =>
      json<DeliverableVersion>(r)
    ),
  // Multipart : pas de chiffrement @repo/network, le BFF passe les octets bruts.
  submitVersionFile: async (id: number, file: File, note: string | null) => {
    const form = new FormData();
    form.append("file", file);
    if (note) form.append("note", note);
    const res = await fetch(`/api/deliverables/${id}/versions/file`, { method: "POST", body: form });
    if (!res.ok) {
      throw new Error((await res.json().catch(() => ({})))?.detail || `Erreur ${res.status}`);
    }
    return (await res.json()) as DeliverableVersion;
  },
  versionFileUrl: (id: number, versionId: number) =>
    `/api/deliverables/${id}/versions/${versionId}/content`,
  decideVersion: (id: number, versionId: number, approved: boolean, note: string | null) =>
    apiFetch(`/api/deliverables/${id}/versions/${versionId}/decision`, {
      method: "POST",
      body: { approved, note },
    }).then((r) => json<DeliverableVersion>(r)),
  getApprovers: (id: number) =>
    apiFetch(`/api/deliverables/${id}/approvers`).then((r) => json<DeliverableApprovers>(r)),
  setApprovers: (id: number, body: { user_ids: number[]; group_ids: number[] }) =>
    apiFetch(`/api/deliverables/${id}/approvers`, { method: "PUT", body }).then((r) =>
      json<DeliverableApprovers>(r)
    ),

  deleteDeliverable: (id: number) =>
    apiFetch(`/api/deliverables/${id}`, { method: "DELETE" }).then((r) => json<void>(r)),

  deletePhase: (id: number) => apiFetch(`/api/phases/${id}`, { method: "DELETE" }).then((r) => json<void>(r)),
};

/** Le module « phase » ne se montre que si le projet a plus qu'une phase implicite
 *  seule : un utilisateur qui veut une simple liste de tâches ne voit jamais le mot. */
export function phasesVisible(phases: Phase[]): boolean {
  return !(phases.length <= 1 && (phases[0]?.est_implicite ?? true));
}

export const PHASE_STATUS_LABELS: Record<string, string> = {
  A_VENIR: "À venir", EN_COURS: "En cours", CLOTUREE: "Clôturée", ANNULEE: "Annulée",
};
export const PHASE_STATUS_ORDER = ["A_VENIR", "EN_COURS", "CLOTUREE", "ANNULEE"];
/** Badge de statut de phase — tokens du design system, aucune couleur en dur. */
export const PHASE_STATUS_TONES: Record<string, { dot: string; chip: string }> = {
  A_VENIR:  { dot: "bg-status-backlog", chip: "bg-status-backlog-container text-status-backlog-on" },
  EN_COURS: { dot: "bg-status-doing",   chip: "bg-status-doing-container text-status-doing" },
  CLOTUREE: { dot: "bg-status-done",    chip: "bg-status-done-container text-status-done" },
  ANNULEE:  { dot: "bg-status-backlog", chip: "bg-surface-container text-on-surface-variant" },
};

export const STATUS_LABELS: Record<string, string> = {
  BACKLOG: "Backlog", A_FAIRE: "À faire", EN_COURS: "En cours", EN_REVUE: "En revue", TERMINE: "Terminé",
};
export const STATUS_ORDER = ["BACKLOG", "A_FAIRE", "EN_COURS", "EN_REVUE", "TERMINE"];
export const PRIORITY_LABELS: Record<string, string> = {
  AUCUNE: "Aucune", BASSE: "Basse", MOYENNE: "Moyenne", HAUTE: "Haute", URGENTE: "Urgente",
};
export const PRIORITY_ORDER = ["AUCUNE", "BASSE", "MOYENNE", "HAUTE", "URGENTE"];

/** Niveau affiché par les barrettes de priorité (`@repo/ui/PriorityBars`). */
export const PRIORITY_LEVELS: Record<string, 0 | 1 | 2 | 3 | 4> = {
  AUCUNE: 0, BASSE: 1, MOYENNE: 2, HAUTE: 3, URGENTE: 4,
};

/** Badge de statut : point + fond « soft », tokens `status-*`. */
export const STATUS_TONES: Record<string, { dot: string; chip: string }> = {
  BACKLOG:  { dot: "bg-status-backlog", chip: "bg-status-backlog-container text-status-backlog-on" },
  A_FAIRE:  { dot: "bg-status-todo",    chip: "bg-status-todo-container text-status-todo-on" },
  EN_COURS: { dot: "bg-status-doing",   chip: "bg-status-doing-container text-status-doing" },
  EN_REVUE: { dot: "bg-status-review",  chip: "bg-status-review-container text-status-review" },
  TERMINE:  { dot: "bg-status-done",    chip: "bg-status-done-container text-status-done" },
};

export const PROJECT_STATUS_LABELS: Record<string, string> = {
  ACTIF: "Actif", EN_PAUSE: "En pause", ARCHIVE: "Archivé",
};
export const PROJECT_STATUS_ORDER = ["ACTIF", "EN_PAUSE", "ARCHIVE"];
export const PROJECT_STATUS_DOTS: Record<string, string> = {
  ACTIF: "bg-status-done", EN_PAUSE: "bg-member-invited", ARCHIVE: "bg-status-backlog",
};

/** Nuancier proposé pour la couleur d'un projet. */
export const PROJECT_COLORS = [
  "#3525cd", "#4f46e5", "#004598", "#0b7285", "#006c49",
  "#b45309", "#ba1a1a", "#7c3aed", "#be185d", "#464555",
];
/** Classe de fond du point de statut — tokens `status-*` du design system. */
export const STATUS_DOTS: Record<string, string> = {
  BACKLOG: "bg-status-backlog",
  A_FAIRE: "bg-status-todo",
  EN_COURS: "bg-status-doing",
  EN_REVUE: "bg-status-review",
  TERMINE: "bg-status-done",
};

export function priorityTone(p: string): string {
  if (p === "URGENTE") return "text-error";
  if (p === "HAUTE") return "text-tertiary";
  return "text-on-surface-variant";
}
