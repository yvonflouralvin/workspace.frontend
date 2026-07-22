"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useSessionStore } from "@repo/auth/store/session.store";
import { usePermissions } from "@repo/auth/hooks/usePermissions";
import { apiFetch } from "@repo/network/client";
import {
  ArrowBackOutlined, AddOutlined, ViewKanbanOutlined, ViewListOutlined,
  ScheduleOutlined, DeleteOutlineOutlined, ExpandMoreOutlined,
} from "@mui/icons-material";
import {
  projectsApi, STATUS_LABELS, STATUS_ORDER, PRIORITY_LABELS, PRIORITY_ORDER, priorityTone,
  type Project, type Task,
} from "@/app/lib/projects-api";

interface Member { id: number; name: string }

export default function ProjectDetailPage() {
  return (
    <Suspense fallback={<div className="p-8 text-sm text-on-surface-variant">Chargement…</div>}>
      <ProjectDetailInner />
    </Suspense>
  );
}

function ProjectDetailInner() {
  const { id } = useParams<{ id: string }>();
  const projectId = Number(id);
  const router = useRouter();
  const searchParams = useSearchParams();
  const { can } = usePermissions();
  const canManage = can("projects.manage");
  const activeWorkspace = useSessionStore((s) => s.activeWorkspace);

  const [project, setProject] = useState<Project | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [view, setView] = useState<"liste" | "kanban">("kanban");
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Task | "new" | null>(null);

  const loadTasks = useCallback(() => projectsApi.listTasks(projectId).then(setTasks), [projectId]);

  useEffect(() => {
    setLoading(true);
    Promise.all([projectsApi.getProject(projectId), projectsApi.listTasks(projectId)])
      .then(([p, t]) => { setProject(p); setTasks(t); })
      .finally(() => setLoading(false));
  }, [projectId]);

  useEffect(() => {
    if (!activeWorkspace?.id) return;
    apiFetch(`/api/workspaces/${activeWorkspace.id}/members`).then((r) => r.ok ? r.json() : []).then((rows) => {
      const list: Member[] = (Array.isArray(rows) ? rows : rows?.items ?? []).map((m: Record<string, unknown>) => ({
        id: Number(m.user_id ?? m.id), name: String(m.username ?? m.name ?? `#${m.user_id ?? m.id}`),
      }));
      setMembers(list.filter((m) => Number.isFinite(m.id)));
    }).catch(() => {});
  }, [activeWorkspace]);

  useEffect(() => {
    const t = searchParams.get("task");
    if (t && tasks.length) { const found = tasks.find((x) => x.id === Number(t)); if (found) setEditing(found); }
  }, [searchParams, tasks]);

  async function moveTask(task: Task, status: string) {
    setTasks((cur) => cur.map((t) => t.id === task.id ? { ...t, status } : t));
    try { await projectsApi.updateTask(task.id, { status }); } finally { loadTasks(); }
  }

  if (loading) return <div className="p-8 text-sm text-on-surface-variant">Chargement…</div>;
  if (!project) return <div className="p-8 text-sm text-error">Projet introuvable.</div>;

  return (
    <div className="p-8 space-y-5">
      <button onClick={() => router.push("/projects")} className="inline-flex items-center gap-1.5 text-sm text-on-surface-variant hover:text-on-surface">
        <ArrowBackOutlined style={{ fontSize: 16 }} /> Projets
      </button>

      <div className="space-y-5">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <span className="w-11 h-11 rounded-xl flex items-center justify-center text-lg"
              style={{ background: (project.color ?? "#3525cd") + "1a", color: project.color ?? "#3525cd" }}>
              {project.icon ?? project.key.slice(0, 2)}
            </span>
            <div>
              <h1 className="text-xl font-bold text-on-surface">{project.name}</h1>
              <p className="text-xs text-on-surface-variant font-mono">{project.key} · {tasks.length} tâche(s)</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex rounded-xl border border-outline-variant overflow-hidden">
              <button onClick={() => setView("liste")} title="Liste" className={`px-3 py-2 ${view === "liste" ? "bg-primary text-on-primary" : "text-on-surface-variant"}`}><ViewListOutlined style={{ fontSize: 18 }} /></button>
              <button onClick={() => setView("kanban")} title="Kanban" className={`px-3 py-2 ${view === "kanban" ? "bg-primary text-on-primary" : "text-on-surface-variant"}`}><ViewKanbanOutlined style={{ fontSize: 18 }} /></button>
            </div>
            {canManage && (
              <button onClick={() => setEditing("new")} className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-on-primary text-sm font-medium">
                <AddOutlined style={{ fontSize: 18 }} /> Nouvelle tâche
              </button>
            )}
          </div>
        </div>
      </div>

      {view === "kanban" ? (
        <KanbanBoard tasks={tasks} canManage={canManage} onMove={moveTask} onOpen={setEditing} projectKey={project.key} />
      ) : (
        <ListView tasks={tasks} onOpen={setEditing} projectKey={project.key} />
      )}

      {editing && (
        <TaskDrawer
          task={editing === "new" ? null : editing}
          projectId={projectId}
          members={members}
          canManage={canManage}
          onClose={() => { setEditing(null); router.replace(`/projects/${projectId}`); }}
          onSaved={() => { loadTasks(); setEditing(null); }}
        />
      )}
    </div>
  );
}

function KanbanBoard({ tasks, canManage, onMove, onOpen, projectKey }: {
  tasks: Task[]; canManage: boolean; onMove: (t: Task, s: string) => void; onOpen: (t: Task) => void; projectKey: string;
}) {
  const [drag, setDrag] = useState<Task | null>(null);
  return (
    <div className="flex gap-3 overflow-x-auto overscroll-x-contain items-start pb-3">
      {STATUS_ORDER.map((status) => {
        const col = tasks.filter((t) => t.status === status);
        return (
          <div key={status}
            onDragOver={(e) => { if (drag) e.preventDefault(); }}
            onDrop={() => { if (drag && drag.status !== status) onMove(drag, status); setDrag(null); }}
            className="w-72 shrink-0 flex flex-col max-h-[70vh] rounded-2xl bg-surface-container/50 border border-outline-variant">
            <div className="flex items-center justify-between px-3 py-2 shrink-0">
              <span className="text-sm font-medium text-on-surface-variant">{STATUS_LABELS[status]}</span>
              <span className="text-xs text-on-surface-variant/60">{col.length}</span>
            </div>
            <div className="min-h-[3.5rem] overflow-y-auto space-y-2 px-2 pb-2">
              {col.map((t) => (
                <div key={t.id} draggable={canManage} onDragStart={() => setDrag(t)} onDragEnd={() => setDrag(null)}
                  onClick={() => onOpen(t)}
                  className="rounded-xl bg-surface-container-lowest border border-outline-variant p-3 cursor-pointer hover:border-primary/40">
                  <p className="text-sm text-on-surface">{t.title}</p>
                  <div className="flex items-center gap-2 mt-2 text-xs text-on-surface-variant">
                    <span className="font-mono">{projectKey}-{t.number}</span>
                    {t.priority !== "AUCUNE" && <span className={priorityTone(t.priority)}>· {PRIORITY_LABELS[t.priority]}</span>}
                    {t.assignee_name && <span className="ml-auto w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px] font-semibold">{t.assignee_name.slice(0, 2).toUpperCase()}</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ListView({ tasks, onOpen, projectKey }: { tasks: Task[]; onOpen: (t: Task) => void; projectKey: string }) {
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const toggle = (s: string) => setCollapsed((cur) => {
    const next = new Set(cur);
    next.has(s) ? next.delete(s) : next.add(s);
    return next;
  });
  const active = STATUS_ORDER.filter((s) => tasks.some((t) => t.status === s));
  if (active.length === 0) return <p className="text-sm text-on-surface-variant py-10 text-center">Aucune tâche pour le moment.</p>;
  return (
    <div className="space-y-3">
      {active.map((status) => {
        const rows = tasks.filter((t) => t.status === status);
        const isOpen = !collapsed.has(status);
        return (
          <div key={status} className="rounded-2xl border border-outline-variant overflow-hidden">
            <button onClick={() => toggle(status)}
              className="w-full flex items-center gap-2 px-4 py-2.5 bg-surface-container-low hover:bg-surface-container text-left">
              <ExpandMoreOutlined style={{ fontSize: 18 }} className={`text-on-surface-variant transition-transform ${isOpen ? "" : "-rotate-90"}`} />
              <span className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider">{STATUS_LABELS[status]}</span>
              <span className="text-xs text-on-surface-variant/60">{rows.length}</span>
            </button>
            {isOpen && rows.map((t, i) => (
              <button key={t.id} onClick={() => onOpen(t)}
                className={`w-full text-left flex items-center gap-3 px-4 py-3 border-t border-outline-variant hover:bg-surface-container-low ${i % 2 === 0 ? "bg-surface-container-lowest" : "bg-surface-container-low/50"}`}>
                <span className="text-xs font-mono text-on-surface-variant w-16 shrink-0">{projectKey}-{t.number}</span>
                <span className="flex-1 text-sm text-on-surface truncate">{t.title}</span>
                {t.priority !== "AUCUNE" && <span className={`text-xs ${priorityTone(t.priority)}`}>{PRIORITY_LABELS[t.priority]}</span>}
                {t.assignee_name && <span className="text-xs text-on-surface-variant">{t.assignee_name}</span>}
                {t.due_date && <span className="text-xs text-on-surface-variant flex items-center gap-1"><ScheduleOutlined style={{ fontSize: 13 }} />{new Date(t.due_date).toLocaleDateString("fr-FR", { day: "2-digit", month: "short" })}</span>}
              </button>
            ))}
          </div>
        );
      })}
    </div>
  );
}

function TaskDrawer({ task, projectId, members, canManage, onClose, onSaved }: {
  task: Task | null; projectId: number; members: Member[]; canManage: boolean; onClose: () => void; onSaved: () => void;
}) {
  const [title, setTitle] = useState(task?.title ?? "");
  const [description, setDescription] = useState(task?.description ?? "");
  const [status, setStatus] = useState(task?.status ?? "A_FAIRE");
  const [priority, setPriority] = useState(task?.priority ?? "AUCUNE");
  const [assignee, setAssignee] = useState<string>(task?.assignee_user_id ? String(task.assignee_user_id) : "");
  const [dueDate, setDueDate] = useState(task?.due_date ? task.due_date.slice(0, 10) : "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setError(null);
    if (!title.trim()) { setError("Le titre est requis."); return; }
    setSaving(true);
    const body = {
      title: title.trim(), description: description.trim() || null, status, priority,
      assignee_user_id: assignee ? Number(assignee) : null,
      due_date: dueDate ? new Date(dueDate).toISOString() : null,
    };
    try {
      if (task) await projectsApi.updateTask(task.id, body);
      else await projectsApi.createTask({ project_id: projectId, ...body });
      onSaved();
    } catch (e) { setError(e instanceof Error ? e.message : "Enregistrement impossible."); }
    finally { setSaving(false); }
  }

  async function remove() {
    if (!task) return;
    setSaving(true);
    try { await projectsApi.deleteTask(task.id); onSaved(); } finally { setSaving(false); }
  }

  const readOnly = !canManage;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40" onClick={onClose}>
      <div className="w-full max-w-[36rem] h-full bg-surface-container-lowest border-l border-outline-variant p-6 space-y-4 overflow-y-auto shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-on-surface">{task ? "Tâche" : "Nouvelle tâche"}</h2>
          <button onClick={onClose} className="text-on-surface-variant hover:text-on-surface">✕</button>
        </div>
        {error && <p className="text-sm text-error">{error}</p>}
        <input className={inputCls} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Titre de la tâche" disabled={readOnly} autoFocus />
        <textarea className={inputCls} rows={5} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Description…" disabled={readOnly} />
        <div className="grid grid-cols-2 gap-3">
          <Sel label="Statut" value={status} onChange={setStatus} options={STATUS_ORDER.map((s) => [s, STATUS_LABELS[s]])} disabled={readOnly} />
          <Sel label="Priorité" value={priority} onChange={setPriority} options={PRIORITY_ORDER.map((p) => [p, PRIORITY_LABELS[p]])} disabled={readOnly} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-on-surface-variant">Assigné</label>
            <select className={inputCls} value={assignee} onChange={(e) => setAssignee(e.target.value)} disabled={readOnly}>
              <option value="">Non assigné</option>
              {members.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-on-surface-variant">Échéance</label>
            <input type="date" className={inputCls} value={dueDate} onChange={(e) => setDueDate(e.target.value)} disabled={readOnly} />
          </div>
        </div>
        {!readOnly && (
          <div className="flex items-center justify-between pt-2">
            {task ? (
              <button onClick={remove} disabled={saving} className="inline-flex items-center gap-1.5 text-sm text-error hover:opacity-70"><DeleteOutlineOutlined style={{ fontSize: 18 }} /> Supprimer</button>
            ) : <span />}
            <button onClick={save} disabled={saving} className="px-5 py-2 rounded-xl bg-primary text-on-primary text-sm font-medium disabled:opacity-50">{saving ? "…" : "Enregistrer"}</button>
          </div>
        )}
      </div>
    </div>
  );
}

function Sel({ label, value, onChange, options, disabled }: { label: string; value: string; onChange: (v: string) => void; options: [string, string][]; disabled?: boolean }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-medium text-on-surface-variant">{label}</label>
      <select className={inputCls} value={value} onChange={(e) => onChange(e.target.value)} disabled={disabled}>
        {options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
      </select>
    </div>
  );
}

const inputCls = "px-3 py-2 rounded-xl border border-outline-variant bg-surface-container-lowest text-sm text-on-surface focus:border-primary outline-none w-full disabled:opacity-60";
