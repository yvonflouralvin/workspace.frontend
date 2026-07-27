"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { useParams, usePathname } from "next/navigation";
import { useSessionStore } from "@repo/auth/store/session.store";
import { usePermissions } from "@repo/auth/hooks/usePermissions";
import { apiFetch } from "@repo/network/client";
import { ArrowBackOutlined } from "@mui/icons-material";
import { AccountTreeOutlined } from "@mui/icons-material";
import { projectsApi, phasesVisible, type Phase, type Project, type Task } from "@/app/lib/projects-api";
import { ProjectProvider, type Member } from "./project-context";
import {
  PROJECT_SECTIONS,
  isPhaseDetailPathname,
  sectionForPathname,
  type ProjectSection,
} from "./sections";

export default function ProjectLayout({ children }: { children: ReactNode }) {
  const { id } = useParams<{ id: string }>();
  const projectId = Number(id);
  const pathname = usePathname();
  const { can } = usePermissions();
  const canManage = can("projects.manage");
  const activeWorkspace = useSessionStore((s) => s.activeWorkspace);

  const [project, setProject] = useState<Project | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [phases, setPhases] = useState<Phase[]>([]);
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

  useEffect(() => {
    setLoading(true);
    Promise.all([
      projectsApi.getProject(projectId),
      projectsApi.listTasks(projectId),
      projectsApi.listPhases(projectId).catch(() => [] as Phase[]),
    ])
      .then(([p, t, ph]) => {
        setProject(p);
        setTasks(t);
        setPhases(ph);
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
  // Insère « Phases » juste après « Board » quand il est visible.
  const sections: ProjectSection[] = showPhases
    ? PROJECT_SECTIONS.flatMap((s) => (s.key === "board" ? [s, phaseSection] : [s]))
    : PROJECT_SECTIONS;

  const current = sectionForPathname(pathname, projectId);
  const color = project.color ?? "#3525cd";
  // Le détail d'une phase installe son propre en-tête et ses propres onglets.
  const phaseDetail = isPhaseDetailPathname(pathname, projectId);

  return (
    <div className="p-4 md:p-8 max-w-[1152px] mx-auto">
      {!phaseDetail && (
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
        value={{ projectId, project, setProject, tasks, setTasks, reloadTasks, phases, reloadPhases, members, canManage }}
      >
        {children}
      </ProjectProvider>
    </div>
  );
}
