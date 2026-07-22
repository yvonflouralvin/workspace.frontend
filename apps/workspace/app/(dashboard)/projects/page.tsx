"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { usePermissions } from "@repo/auth/hooks/usePermissions";
import {
  AddOutlined, FolderOpenOutlined, CheckCircleOutlined, ScheduleOutlined,
} from "@mui/icons-material";
import {
  projectsApi, STATUS_LABELS, PRIORITY_LABELS, priorityTone,
  type Project, type Task,
} from "@/app/lib/projects-api";

export default function ProjectsPage() {
  return (
    <Suspense fallback={<div className="p-8 text-sm text-on-surface-variant">Chargement…</div>}>
      <ProjectsInner />
    </Suspense>
  );
}

function ProjectsInner() {
  const { can } = usePermissions();
  const canManage = can("projects.manage");
  const params = useSearchParams();
  const [view, setView] = useState<"projects" | "mine">("projects");
  const [projects, setProjects] = useState<Project[]>([]);
  const [mine, setMine] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);

  useEffect(() => {
    if (params.get("create") === "1" && canManage) setShowCreate(true);
  }, [params, canManage]);

  function reload() {
    setLoading(true);
    Promise.all([projectsApi.listProjects(), projectsApi.myTasks()])
      .then(([p, m]) => { setProjects(p); setMine(m); })
      .finally(() => setLoading(false));
  }
  useEffect(() => { reload(); }, []);

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-on-surface">Projets</h1>
          <p className="text-sm text-on-surface-variant mt-1">Organisez le travail de votre workspace.</p>
        </div>
        {canManage && (
          <button onClick={() => setShowCreate(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-on-primary text-sm font-medium hover:bg-primary-container transition-colors">
            <AddOutlined style={{ fontSize: 18 }} /> Nouveau projet
          </button>
        )}
      </div>

      <div className="flex gap-1 rounded-xl border border-outline-variant overflow-hidden w-fit">
        {(["projects", "mine"] as const).map((v) => (
          <button key={v} onClick={() => setView(v)}
            className={`px-4 py-2 text-sm ${view === v ? "bg-primary text-on-primary" : "text-on-surface-variant hover:bg-surface-container"}`}>
            {v === "projects" ? "Projets" : `Mes tâches${mine.length ? ` (${mine.length})` : ""}`}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-sm text-on-surface-variant">Chargement…</p>
      ) : view === "projects" ? (
        projects.length === 0 ? (
          <EmptyState canManage={canManage} onCreate={() => setShowCreate(true)} />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {projects.map((p) => <ProjectCard key={p.id} project={p} />)}
          </div>
        )
      ) : (
        <MyTasksList tasks={mine} />
      )}

      {showCreate && (
        <CreateProjectModal onClose={() => setShowCreate(false)} onCreated={reload} />
      )}
    </div>
  );
}

function ProjectCard({ project: p }: { project: Project }) {
  const pct = p.task_count ? Math.round(((p.done_count ?? 0) / p.task_count) * 100) : 0;
  return (
    <Link href={`/projects/${p.id}`}
      className="block rounded-2xl border border-outline-variant bg-surface-container-lowest p-5 hover:border-primary/40 hover:bg-primary/5 transition-colors">
      <div className="flex items-center gap-3">
        <span className="w-10 h-10 rounded-xl flex items-center justify-center text-lg"
          style={{ background: (p.color ?? "#3525cd") + "1a", color: p.color ?? "#3525cd" }}>
          {p.icon ?? p.key.slice(0, 2)}
        </span>
        <div className="min-w-0">
          <p className="font-semibold text-on-surface truncate">{p.name}</p>
          <p className="text-xs text-on-surface-variant font-mono">{p.key}</p>
        </div>
      </div>
      {p.description && <p className="text-sm text-on-surface-variant mt-3 line-clamp-2">{p.description}</p>}
      <div className="flex items-center gap-2 mt-4 text-xs text-on-surface-variant">
        <FolderOpenOutlined style={{ fontSize: 14 }} /> {p.task_count ?? 0} tâche(s)
        <span className="text-on-surface-variant/40">·</span>
        <CheckCircleOutlined style={{ fontSize: 14 }} /> {pct}%
      </div>
      <div className="h-1.5 rounded-full bg-surface-container mt-2 overflow-hidden">
        <div className="h-full bg-secondary rounded-full" style={{ width: `${pct}%` }} />
      </div>
    </Link>
  );
}

function MyTasksList({ tasks }: { tasks: Task[] }) {
  const router = useRouter();
  if (tasks.length === 0) return <p className="text-sm text-on-surface-variant py-10 text-center">Aucune tâche qui vous est assignée. 🎉</p>;
  return (
    <div className="rounded-2xl border border-outline-variant overflow-hidden">
      {tasks.map((t, i) => (
        <button key={t.id} onClick={() => router.push(`/projects/${t.project_id}?task=${t.id}`)}
          className={`w-full text-left flex items-center gap-3 px-4 py-3 border-b border-outline-variant last:border-0 hover:bg-surface-container-low ${i % 2 === 0 ? "bg-surface-container-lowest" : "bg-surface-container-low/50"}`}>
          <span className="text-xs font-mono text-on-surface-variant w-16 shrink-0">{t.project_key}-{t.number}</span>
          <span className="flex-1 text-sm text-on-surface truncate">{t.title}</span>
          {t.priority !== "AUCUNE" && <span className={`text-xs ${priorityTone(t.priority)}`}>{PRIORITY_LABELS[t.priority]}</span>}
          <span className="text-xs px-2 py-0.5 rounded-full bg-surface-container text-on-surface-variant">{STATUS_LABELS[t.status]}</span>
          {t.due_date && <span className="text-xs text-on-surface-variant flex items-center gap-1"><ScheduleOutlined style={{ fontSize: 13 }} />{new Date(t.due_date).toLocaleDateString("fr-FR", { day: "2-digit", month: "short" })}</span>}
        </button>
      ))}
    </div>
  );
}

function EmptyState({ canManage, onCreate }: { canManage: boolean; onCreate: () => void }) {
  return (
    <div className="rounded-2xl border border-dashed border-outline-variant bg-surface-container-lowest px-6 py-16 text-center">
      <FolderOpenOutlined style={{ fontSize: 40 }} className="text-on-surface-variant/40" />
      <p className="text-on-surface-variant mt-3">Aucun projet pour le moment.</p>
      {canManage && (
        <button onClick={onCreate} className="mt-4 inline-flex items-center gap-2 text-primary text-sm font-medium hover:underline">
          <AddOutlined style={{ fontSize: 18 }} /> Créer votre premier projet
        </button>
      )}
    </div>
  );
}

function CreateProjectModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [key, setKey] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setError(null);
    if (!name.trim()) { setError("Le nom est requis."); return; }
    setSaving(true);
    try {
      const p = await projectsApi.createProject({ name: name.trim(), key: key.trim() || name.trim(), description: description.trim() || undefined });
      onCreated();
      onClose();
      router.push(`/projects/${p.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Création impossible.");
    } finally { setSaving(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-24 bg-black/40 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="w-full max-w-[36rem] rounded-2xl bg-surface-container-lowest border border-outline-variant shadow-2xl p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-lg font-semibold text-on-surface">Nouveau projet</h2>
        {error && <p className="text-sm text-error">{error}</p>}
        <Field label="Nom *"><input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} placeholder="Refonte du site" autoFocus /></Field>
        <Field label="Clé (préfixe des tâches)"><input className={inputCls} value={key} onChange={(e) => setKey(e.target.value.toUpperCase())} placeholder="WEB" maxLength={12} /></Field>
        <Field label="Description"><textarea className={inputCls} rows={3} value={description} onChange={(e) => setDescription(e.target.value)} /></Field>
        <div className="flex justify-end gap-3 pt-2">
          <button onClick={onClose} disabled={saving} className="px-4 py-2 rounded-xl text-sm text-on-surface-variant hover:bg-surface-container">Annuler</button>
          <button onClick={submit} disabled={saving} className="px-5 py-2 rounded-xl bg-primary text-on-primary text-sm font-medium disabled:opacity-50">{saving ? "Création…" : "Créer"}</button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="flex flex-col gap-1"><label className="text-xs font-medium text-on-surface-variant">{label}</label>{children}</div>;
}
const inputCls = "px-3 py-2 rounded-xl border border-outline-variant bg-surface-container-lowest text-sm text-on-surface focus:border-primary outline-none w-full";
