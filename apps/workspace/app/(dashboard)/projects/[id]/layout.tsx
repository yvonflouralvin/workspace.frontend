"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { useParams, usePathname } from "next/navigation";
import { useSessionStore } from "@repo/auth/store/session.store";
import { usePermissions } from "@repo/auth/hooks/usePermissions";
import { apiFetch } from "@repo/network/client";
import { ArrowBackOutlined } from "@mui/icons-material";
import { AccountTreeOutlined, InventoryOutlined } from "@mui/icons-material";
import {
  projectsApi,
  phasesVisible,
  type Deliverable,
  type Phase,
  type Project,
  type ProjectRole,
  type Task,
} from "@/app/lib/projects-api";
import { ProjectProvider, type Member } from "./project-context";
import {
  PROJECT_SECTIONS,
  isDetailPathname,
  sectionForPathname,
  type ProjectSection,
} from "./sections";

export default function ProjectLayout({ children }: { children: ReactNode }) {
  const { id } = useParams<{ id: string }>();
  const projectId = Number(id);
  const pathname = usePathname();
  const { can } = usePermissions();
  const activeWorkspace = useSessionStore((s) => s.activeWorkspace);

  const [project, setProject] = useState<Project | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [phases, setPhases] = useState<Phase[]>([]);
  const [deliverables, setDeliverables] = useState<Deliverable[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);

  const reloadTasks = useCallback(
    () => projectsApi.listTasks(projectId).then(setTasks),
    [projectId]
  );
  const reloadPhases = useCallback(
    () => projectsApi.listPhases(projectId).then(setPhases),
    [projectId]
  );
  const reloadDeliverables = useCallback(
    () => projectsApi.listProjectDeliverables(projectId).then(setDeliverables).catch(() => {}),
    [projectId]
  );

  useEffect(() => {
    setLoading(true);
    Promise.all([
      projectsApi.getProject(projectId),
      projectsApi.listTasks(projectId),
      projectsApi.listPhases(projectId).catch(() => [] as Phase[]),
      projectsApi.listProjectDeliverables(projectId).catch(() => [] as Deliverable[]),
    ])
      .then(([p, t, ph, dl]) => {
        setProject(p);
        setTasks(t);
        setPhases(ph);
        setDeliverables(dl);
      })
      .catch(() => setProject(null))
      .finally(() => setLoading(false));
  }, [projectId]);

  useEffect(() => {
    if (!activeWorkspace?.id) return;
    apiFetch(`/api/workspaces/${activeWorkspace.id}/members`)
      .then((r) => (r.ok ? r.json() : []))
      .then((rows) => {
        const list: Member[] = (Array.isArray(rows) ? rows : (rows?.items ?? [])).map(
          (m: Record<string, unknown>) => ({
            id: Number(m.user_id ?? m.id),
            name: String(m.username ?? m.name ?? `#${m.user_id ?? m.id}`),
          })
        );
        setMembers(list.filter((m) => Number.isFinite(m.id)));
      })
      .catch(() => {});
  }, [activeWorkspace]);

  if (loading) {
    return <div className="p-4 md:p-8 text-body-md text-on-surface-variant">Chargement…</div>;
  }
  if (!project) {
    return <div className="p-4 md:p-8 text-body-md text-error">Projet introuvable.</div>;
  }

  // Le module « phase » n'apparaît que s'il y a plus qu'une phase implicite seule.
  const showPhases = phasesVisible(phases);
  const phaseSection: ProjectSection = {
    key: "phases",
    path: "/phases",
    label: "Phases",
    icon: <AccountTreeOutlined style={{ fontSize: 17 }} />,
  };
  // L'onglet n'apparaît que si le projet porte au moins un livrable — phase ou
  // tâche confondues. Un projet qui n'en a pas ne voit pas le mot.
  const deliverableSection: ProjectSection = {
    key: "deliverables",
    path: "/deliverables",
    label: "Livrables",
    icon: <InventoryOutlined style={{ fontSize: 17 }} />,
  };
  // Insère « Phases » puis « Livrables » juste après « Board », quand ils existent.
  const afterBoard = [
    ...(showPhases ? [phaseSection] : []),
    ...(deliverables.length ? [deliverableSection] : []),
  ];
  const sections: ProjectSection[] = afterBoard.length
    ? PROJECT_SECTIONS.flatMap((s) => (s.key === "board" ? [s, ...afterBoard] : [s]))
    : PROJECT_SECTIONS;

  // Le rôle vient du backend (il connaît l'appartenance) ; le RBAC workspace reste
  // la porte d'entrée, mais il ne dit plus à lui seul ce qu'on peut faire ici.
  const role: ProjectRole = project.my_role ?? (can("projects.manage") ? "MEMBER" : "VIEWER");
  const isOwner = role === "OWNER";
  const canManage = role !== "VIEWER";

  const current = sectionForPathname(pathname, projectId);
  const color = project.color ?? "#3525cd";
  // Le détail d'une phase ou d'une tâche installe son propre en-tête et ses onglets.
  const objectDetail = isDetailPathname(pathname, projectId);

  return (
    <div className="p-4 md:p-8 max-w-[1152px] mx-auto">
      {!objectDetail && (
        <>
          <Link
            href="/projects"
            className="inline-flex items-center gap-1.5 text-body-sm font-medium text-on-surface-variant hover:text-primary transition-colors mb-4"
          >
            <ArrowBackOutlined style={{ fontSize: 15 }} />
            Projets
          </Link>

          <div className="flex items-center gap-3.5">
            <span
              className="w-11 h-11 flex-none rounded-[11px] flex items-center justify-center font-display text-body-lg font-semibold"
              style={{ background: `color-mix(in srgb, ${color} 10%, transparent)`, color }}
            >
              {project.icon ?? project.key.slice(0, 2)}
            </span>
            <div className="min-w-0">
              <h1 className="font-display text-headline-sm text-on-surface truncate">{project.name}</h1>
              <p className="font-mono text-label-md text-outline">
                {project.key} · {tasks.length} tâche{tasks.length > 1 ? "s" : ""}
              </p>
            </div>
          </div>

          <nav className="flex items-center gap-1 border-b border-outline-soft mt-5 mb-5 overflow-x-auto">
            {sections.map((section) => {
              const active = section.key === current.key;
              const label = (
                <>
                  <span className="inline-flex items-center">{section.icon}</span>
                  {section.label}
                  {section.soon && (
                    <span className="text-[10px] font-semibold uppercase tracking-wide text-outline bg-surface-container rounded px-1.5 py-0.5">
                      Bientôt
                    </span>
                  )}
                </>
              );
              const className = `inline-flex items-center gap-1.5 px-3 py-2.5 -mb-px border-b-2 whitespace-nowrap text-body-sm font-medium transition-colors ${
                active
                  ? "border-primary text-primary"
                  : "border-transparent text-on-surface-variant hover:text-on-surface"
              }`;

              if (section.soon) {
                return (
                  <span
                    key={section.key}
                    aria-disabled
                    className={`${className} text-outline-variant cursor-not-allowed hover:text-outline-variant`}
                  >
                    {label}
                  </span>
                );
              }
              return (
                <Link key={section.key} href={`/projects/${projectId}${section.path}`} className={className}>
                  {label}
                </Link>
              );
            })}
          </nav>
        </>
      )}

      <ProjectProvider
        value={{ projectId, project, setProject, tasks, setTasks, reloadTasks, phases, reloadPhases, deliverables, reloadDeliverables, members, role, canManage, isOwner }}
      >
        {children}
      </ProjectProvider>
    </div>
  );
}
