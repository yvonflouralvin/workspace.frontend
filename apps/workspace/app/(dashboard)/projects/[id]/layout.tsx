"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { useParams, usePathname } from "next/navigation";
import { useSessionStore } from "@repo/auth/store/session.store";
import { usePermissions } from "@repo/auth/hooks/usePermissions";
import { apiFetch } from "@repo/network/client";
import { ArrowBackOutlined } from "@mui/icons-material";
import { AccountTreeOutlined, FlagOutlined, InventoryOutlined } from "@mui/icons-material";
import { jalonsApi, type Jalon } from "@/app/lib/jalons-api";
import {
  projectsApi,
  phasesVisible,
  workItemsActifs,
  type Deliverable,
  type Etat,
  type Phase,
  type Project,
  type ProjectRole,
  type Task,
} from "@/app/lib/projects-api";
import { ProjectProvider, type Member } from "./project-context";
import {
  PROJECT_SECTIONS,
  TIMELINE_SECTION,
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
  const [jalons, setJalons] = useState<Jalon[]>([]);
  const [etats, setEtats] = useState<Etat[]>([]);
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

  const reloadJalons = useCallback(
    () => jalonsApi.list(projectId).then(setJalons).catch(() => {}),
    [projectId]
  );

  useEffect(() => {
    setLoading(true);
    Promise.all([
      projectsApi.getProject(projectId),
      projectsApi.listTasks(projectId),
      projectsApi.listPhases(projectId).catch(() => [] as Phase[]),
      projectsApi.listProjectDeliverables(projectId).catch(() => [] as Deliverable[]),
      projectsApi.listEtats(projectId).catch(() => [] as Etat[]),
      jalonsApi.list(projectId).catch(() => [] as Jalon[]),
    ])
      .then(([p, t, ph, dl, et, jl]) => {
        setProject(p);
        setTasks(t);
        setPhases(ph);
        setDeliverables(dl);
        setEtats(et);
        setJalons(jl);
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
  // « Tâches » n'apparaît que si au moins une phase a activé l'outil Éléments de
  // travail : un projet qui n'en gère pas ne doit pas exhiber un onglet vide.
  const showTasks = workItemsActifs(phases);
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
  // Les jalons vivent au niveau PROJET et non dans l'onglet Phases : celui-ci est
  // masqué tant qu'il n'y a qu'une phase implicite, ce qui rendrait les gates
  // invisibles sur la majorité des projets.
  const jalonSection: ProjectSection = {
    key: "jalons",
    path: "/jalons",
    label: "Jalons",
    icon: <FlagOutlined style={{ fontSize: 17 }} />,
  };
  // Le tableau vit désormais DANS une phase : il n'y a plus d'onglet Board au
  // niveau projet, où les limites de WIP de deux phases se seraient mélangées.
  // L'échéancier ne s'ouvre que si quelque chose porte une date : un axe vide
  // n'apprend rien et fait croire à un écran cassé.
  const dateQuelquePart =
    phases.some((p) => p.start_planned && p.end_planned) ||
    jalons.some((j) => j.date_prevue) ||
    deliverables.some((d) => d.due_date) ||
    tasks.some((t) => t.start_date && t.due_date);
  const conditionnels = [
    ...(showPhases ? [phaseSection] : []),
    ...(dateQuelquePart ? [TIMELINE_SECTION] : []),
    ...(jalons.length ? [jalonSection] : []),
    ...(deliverables.length ? [deliverableSection] : []),
  ];
  const sections: ProjectSection[] = PROJECT_SECTIONS.flatMap((s) => {
    if (s.key === "tasks" && !showTasks) return [];
    return s.key === "overview" ? [s, ...conditionnels] : [s];
  });

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
        value={{ projectId, project, setProject, tasks, setTasks, reloadTasks, phases, reloadPhases, deliverables, reloadDeliverables, jalons, reloadJalons, etats, members, role, canManage, isOwner }}
      >
        {children}
      </ProjectProvider>
    </div>
  );
}
