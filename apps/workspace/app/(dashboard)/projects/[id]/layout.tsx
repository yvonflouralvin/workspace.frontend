"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import { useParams, usePathname, useRouter } from "next/navigation";
import { useSessionStore } from "@repo/auth/store/session.store";
import { usePermissions } from "@repo/auth/hooks/usePermissions";
import { apiFetch } from "@repo/network/client";
import { DropdownMenu } from "@repo/ui/DropdownMenu";
import { ArrowBackOutlined } from "@mui/icons-material";
import { projectsApi, type Project, type Task } from "@/app/lib/projects-api";
import { ProjectProvider, type Member } from "./project-context";
import { PROJECT_SECTIONS, sectionForPathname } from "./sections";

export default function ProjectLayout({ children }: { children: ReactNode }) {
  const { id } = useParams<{ id: string }>();
  const projectId = Number(id);
  const router = useRouter();
  const pathname = usePathname();
  const { can } = usePermissions();
  const canManage = can("projects.manage");
  const activeWorkspace = useSessionStore((s) => s.activeWorkspace);

  const [project, setProject] = useState<Project | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);

  const reloadTasks = useCallback(
    () => projectsApi.listTasks(projectId).then(setTasks),
    [projectId],
  );

  useEffect(() => {
    setLoading(true);
    Promise.all([projectsApi.getProject(projectId), projectsApi.listTasks(projectId)])
      .then(([p, t]) => {
        setProject(p);
        setTasks(t);
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
          }),
        );
        setMembers(list.filter((m) => Number.isFinite(m.id)));
      })
      .catch(() => {});
  }, [activeWorkspace]);

  if (loading) return <div className="p-8 text-sm text-on-surface-variant">Chargement…</div>;
  if (!project) return <div className="p-8 text-sm text-error">Projet introuvable.</div>;

  const current = sectionForPathname(pathname, projectId);

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-5">
      <button
        onClick={() => router.push("/projects")}
        className="inline-flex items-center gap-1.5 text-sm text-on-surface-variant hover:text-on-surface"
      >
        <ArrowBackOutlined style={{ fontSize: 16 }} /> Projets
      </button>

      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <span
            className="w-11 h-11 rounded-xl flex items-center justify-center text-lg"
            style={{
              background: (project.color ?? "#3525cd") + "1a",
              color: project.color ?? "#3525cd",
            }}
          >
            {project.icon ?? project.key.slice(0, 2)}
          </span>
          <div>
            <h1 className="text-xl font-bold text-on-surface">{project.name}</h1>
            <p className="text-xs text-on-surface-variant font-mono">
              {project.key} · {tasks.length} tâche(s)
            </p>
          </div>
        </div>

        <DropdownMenu
          label={current.label}
          icon={current.icon}
          items={PROJECT_SECTIONS.map((s) => ({
            key: s.key,
            label: s.label,
            icon: s.icon,
            onClick: () => router.push(`/projects/${projectId}${s.path}`),
          }))}
        />
      </div>

      <ProjectProvider
        value={{ projectId, project, setProject, tasks, setTasks, reloadTasks, members, canManage }}
      >
        {children}
      </ProjectProvider>
    </div>
  );
}
