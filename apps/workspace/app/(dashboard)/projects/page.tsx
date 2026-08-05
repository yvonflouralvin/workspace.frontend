"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { usePermissions } from "@repo/auth/hooks/usePermissions";
import { SearchField } from "@repo/ui/SearchField";
import { Toast } from "@repo/ui/Toast";
import {
  AddOutlined,
  CheckCircleOutlined,
  ErrorOutlineOutlined,
  FolderOpenOutlined,
  SwapVertOutlined,
} from "@mui/icons-material";
import { projectsApi, type Project, type Task } from "@/app/lib/projects-api";
import { CreateProjectModal } from "@/components/projects/CreateProjectModal";
import { TaskRow } from "@/components/projects/TaskRow";

type SortKey = "recent" | "name" | "progress";

const SORTS: { key: SortKey; label: string }[] = [
  { key: "recent", label: "Récents" },
  { key: "name", label: "A → Z" },
  { key: "progress", label: "Avancement" },
];

function progress(p: Project): number {
  return p.task_count ? Math.round(((p.done_count ?? 0) / p.task_count) * 100) : 0;
}

export default function ProjectsPage() {
  return (
    <Suspense fallback={<div className="p-4 md:p-8 text-body-md text-on-surface-variant">Chargement…</div>}>
      <ProjectsInner />
    </Suspense>
  );
}

function ProjectsInner() {
  const { can } = usePermissions();
  const canManage = can("projects.manage");
  const params = useSearchParams();
  const router = useRouter();

  const [view, setView] = useState<"projects" | "mine">("projects");
  const [projects, setProjects] = useState<Project[]>([]);
  const [mine, setMine] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortKey>("recent");
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (params.get("create") === "1" && canManage) {
      setShowCreate(true);
      // L'intention « ouvre la fenêtre » se consomme UNE fois. Laissée dans
      // l'adresse, elle rouvre la fenêtre au retour arrière, au rafraîchissement,
      // et même après que la chose a été créée — elle ne dépend pas de ce qui existe.
      router.replace(window.location.pathname, { scroll: false });
    }
  }, [params, canManage]);

  function reload() {
    setLoading(true);
    setError(false);
    Promise.all([projectsApi.listProjects(), projectsApi.myTasks()])
      .then(([p, m]) => {
        setProjects(p);
        setMine(m);
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }
  useEffect(reload, []);

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const filtered = needle
      ? projects.filter(
          (p) =>
            p.name.toLowerCase().includes(needle) ||
            p.key.toLowerCase().includes(needle) ||
            (p.description ?? "").toLowerCase().includes(needle)
        )
      : projects;
    const sorted = [...filtered];
    if (sort === "name") sorted.sort((a, b) => a.name.localeCompare(b.name));
    else if (sort === "progress") sorted.sort((a, b) => progress(b) - progress(a));
    return sorted;
  }, [projects, query, sort]);

  return (
    <div className="p-4 md:p-8 max-w-[1152px] mx-auto">
      <div className="flex items-start gap-4 mb-6">
        <div className="hidden md:block flex-1">
          <h1 className="font-display text-headline-md text-on-surface">Projets</h1>
          <p className="text-body-md text-on-surface-variant mt-0.5">
            Organisez le travail de votre workspace.
          </p>
        </div>
        {canManage && (
          <button
            onClick={() => setShowCreate(true)}
            className="inline-flex items-center justify-center gap-1.5 h-11 md:h-[38px] px-4 rounded-lg bg-primary text-on-primary text-body-sm font-semibold shadow-button hover:bg-primary-container transition-colors whitespace-nowrap"
          >
            <AddOutlined style={{ fontSize: 16 }} />
            Nouveau projet
          </button>
        )}
      </div>

      <div className="flex items-center gap-3 flex-wrap mb-5">
        <div className="inline-flex p-[3px] rounded-lg border border-outline-soft bg-surface-container-low">
          {(["projects", "mine"] as const).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-label-md font-semibold transition-colors ${
                view === v ? "bg-primary text-on-primary" : "text-on-surface-variant"
              }`}
            >
              {v === "projects" ? "Projets" : "Mes tâches"}
              {v === "mine" && mine.length > 0 && (
                <span
                  className={`text-[11px] rounded-full px-1.5 ${
                    view === v ? "bg-on-primary/20" : "bg-surface-container text-on-surface-variant"
                  }`}
                >
                  {mine.length}
                </span>
              )}
            </button>
          ))}
        </div>

        {view === "projects" && (
          <>
            <SearchField
              value={query}
              onChange={setQuery}
              placeholder="Rechercher un projet…"
              className="flex-1 min-w-[180px] md:flex-none md:w-[240px] md:ml-auto"
            />
            <label className="inline-flex items-center gap-1.5 h-[38px] px-3 rounded-lg border border-outline-soft bg-surface-container-lowest text-outline">
              <SwapVertOutlined style={{ fontSize: 16 }} />
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value as SortKey)}
                className="bg-transparent text-body-sm text-on-surface outline-none"
                aria-label="Trier les projets"
              >
                {SORTS.map((s) => (
                  <option key={s.key} value={s.key}>
                    {s.label}
                  </option>
                ))}
              </select>
            </label>
          </>
        )}
      </div>

      {view === "projects" ? (
        loading ? (
          <SkeletonGrid />
        ) : error ? (
          <ErrorState onRetry={reload} />
        ) : projects.length === 0 ? (
          <EmptyState canManage={canManage} onCreate={() => setShowCreate(true)} />
        ) : visible.length === 0 ? (
          <p className="rounded-2xl border border-outline-soft bg-surface-container-lowest px-6 py-12 text-center text-body-md text-on-surface-variant">
            Aucun projet ne correspond à « {query} ».
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {visible.map((p) => (
              <ProjectCard key={p.id} project={p} />
            ))}
          </div>
        )
      ) : (
        <MyTasksList tasks={mine} loading={loading} />
      )}

      {showCreate && (
        <CreateProjectModal
          onClose={() => setShowCreate(false)}
          onCreated={(project) => {
            setToast(`Projet « ${project.name} » créé.`);
            reload();
          }}
        />
      )}

      {toast && <Toast message={toast} onDismiss={() => setToast(null)} />}
    </div>
  );
}

function ProjectCard({ project: p }: { project: Project }) {
  const pct = progress(p);
  const color = p.color ?? "#3525cd";
  return (
    <Link
      href={`/projects/${p.id}`}
      className="block rounded-2xl border border-outline-soft bg-surface-container-lowest p-5 hover:border-primary/40 hover:bg-primary/[0.03] transition-colors"
    >
      <div className="flex items-center gap-3">
        <span
          className="w-10 h-10 flex-none rounded-[10px] flex items-center justify-center font-display text-body-md font-semibold"
          style={{ background: `color-mix(in srgb, ${color} 10%, transparent)`, color }}
        >
          {p.icon ?? p.key.slice(0, 2)}
        </span>
        <div className="min-w-0">
          <p className="font-display text-[15px] font-semibold text-on-surface truncate">{p.name}</p>
          <p className="font-mono text-label-md text-outline">{p.key}</p>
        </div>
      </div>

      {p.description && (
        <p className="text-body-sm text-on-surface-variant mt-3 line-clamp-2">{p.description}</p>
      )}

      <div className="flex items-center gap-2 mt-4 text-label-md text-outline">
        <FolderOpenOutlined style={{ fontSize: 14 }} />
        {p.task_count ?? 0} tâche{(p.task_count ?? 0) > 1 ? "s" : ""}
        <span className="text-outline-variant">·</span>
        <CheckCircleOutlined style={{ fontSize: 14 }} />
        {pct} %
      </div>
      <div className="h-1.5 rounded-full bg-surface-container mt-2 overflow-hidden">
        <div className="h-full bg-secondary rounded-full" style={{ width: `${pct}%` }} />
      </div>
    </Link>
  );
}

function MyTasksList({ tasks, loading }: { tasks: Task[]; loading: boolean }) {
  if (loading) {
    return <div className="h-40 rounded-2xl bg-surface-container-low animate-pulse" />;
  }
  if (tasks.length === 0) {
    return (
      <p className="rounded-2xl border border-outline-soft bg-surface-container-lowest px-6 py-12 text-center text-body-md text-on-surface-variant">
        Aucune tâche ne vous est assignée. 🎉
      </p>
    );
  }
  return (
    <div className="rounded-2xl border border-outline-soft bg-surface-container-lowest overflow-hidden">
      {tasks.map((t, i) => (
        <TaskRow
          key={t.id}
          task={t}
          index={i}
          href={`/projects/${t.project_id}/tasks?task=${t.id}`}
        />
      ))}
    </div>
  );
}

function SkeletonGrid() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {Array.from({ length: 6 }, (_, i) => (
        <div
          key={i}
          className="rounded-2xl border border-outline-soft bg-surface-container-lowest p-5"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-[10px] bg-surface-container-low animate-pulse" />
            <div className="space-y-1.5">
              <div className="h-3.5 w-32 rounded bg-surface-container-low animate-pulse" />
              <div className="h-2.5 w-16 rounded bg-surface-container-low animate-pulse" />
            </div>
          </div>
          <div className="h-3 w-full rounded bg-surface-container-low animate-pulse mt-4" />
          <div className="h-3 w-2/3 rounded bg-surface-container-low animate-pulse mt-2" />
          <div className="h-1.5 w-full rounded-full bg-surface-container-low animate-pulse mt-5" />
        </div>
      ))}
    </div>
  );
}

function ErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="rounded-2xl border border-error-container bg-error-container/20 px-6 py-12 text-center">
      <ErrorOutlineOutlined style={{ fontSize: 32 }} className="text-error" />
      <p className="text-body-md text-on-surface mt-2">Impossible de charger les projets.</p>
      <button
        onClick={onRetry}
        className="mt-4 h-9 px-4 rounded-lg bg-primary text-on-primary text-body-sm font-semibold"
      >
        Réessayer
      </button>
    </div>
  );
}

function EmptyState({ canManage, onCreate }: { canManage: boolean; onCreate: () => void }) {
  return (
    <div className="rounded-2xl border border-dashed border-outline-variant bg-surface-container-lowest px-6 py-16 text-center">
      <FolderOpenOutlined style={{ fontSize: 40 }} className="text-outline-variant" />
      <p className="text-body-md text-on-surface-variant mt-3">Aucun projet pour le moment.</p>
      {canManage && (
        <button
          onClick={onCreate}
          className="mt-4 inline-flex items-center gap-1.5 text-body-sm font-semibold text-primary hover:underline"
        >
          <AddOutlined style={{ fontSize: 16 }} />
          Créer votre premier projet
        </button>
      )}
    </div>
  );
}
