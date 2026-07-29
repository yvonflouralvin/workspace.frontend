"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { useParams, usePathname } from "next/navigation";
import {
  ArrowBackOutlined,
  CloudDoneOutlined,
  CloudOffOutlined,
  CloudSyncOutlined,
  InventoryOutlined,
  NotesOutlined,
} from "@mui/icons-material";
import {
  deliverablesOnTask,
  toneFor,
  projectsApi,
  type Task,
} from "@/app/lib/projects-api";
import { useAutosave, type EtatSauvegarde } from "@/app/lib/autosave";
import { useProject } from "../../project-context";
import { TaskProvider } from "./task-context";

export default function TaskLayout({ children }: { children: ReactNode }) {
  const { taskId } = useParams<{ taskId: string }>();
  const pathname = usePathname();
  const { projectId, project, tasks, phases, reloadTasks, canManage } = useProject();
  const task = tasks.find((t) => t.id === Number(taskId)) ?? null;
  const phase = phases.find((p) => p.id === task?.phase_id) ?? null;

  const [title, setTitle] = useState(task?.title ?? "");

  useEffect(() => {
    if (task) setTitle(task.title);
  }, [task?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const taskIdNum = task?.id;
  const { queue, etat, echec, oublierEchec } = useAutosave<Task>(
    useCallback(
      (patch) => {
        if (!taskIdNum) return Promise.resolve();
        return projectsApi.updateTask(taskIdNum, patch);
      },
      [taskIdNum]
    ),
    reloadTasks
  );

  if (!task) {
    return (
      <div className="space-y-4">
        <BackToTasks projectId={projectId} />
        <p className="text-body-md text-error">Tâche introuvable.</p>
      </div>
    );
  }

  const base = `/projects/${projectId}/tasks/${task.id}`;
  const sections = [
    { key: "overview", href: base, label: "Aperçu", icon: <NotesOutlined style={{ fontSize: 17 }} /> },
    // Les livrables d'une tâche n'existent que si sa phase les y autorise.
    ...(phase && deliverablesOnTask(phase)
      ? [
          {
            key: "deliverables",
            href: `${base}/deliverables`,
            label: "Livrables",
            icon: <InventoryOutlined style={{ fontSize: 17 }} />,
          },
        ]
      : []),
  ];
  const tone = toneFor(task.categorie);

  return (
    <div>
      <BackToTasks projectId={projectId} />

      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <span className="flex items-center gap-1.5 text-label-md font-medium text-outline">
            <Link href={`/projects/${projectId}`} className="truncate hover:text-primary transition-colors">
              {project.name}
            </Link>
            <span aria-hidden>·</span>
            <span className="font-mono">
              {project.key}-{task.number}
            </span>
            {phase && (
              <>
                <span aria-hidden>·</span>
                <Link
                  href={`/projects/${projectId}/phases/${phase.id}`}
                  className="truncate hover:text-primary transition-colors"
                >
                  {phase.name}
                </Link>
              </>
            )}
          </span>
          {canManage ? (
            <input
              aria-label="Titre de la tâche"
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                if (e.target.value.trim()) queue({ title: e.target.value.trim() });
              }}
              placeholder="Titre de la tâche"
              className="mt-0.5 w-full bg-transparent font-display text-headline-md text-on-surface outline-none border-b border-transparent hover:border-outline-soft focus:border-primary transition-colors"
            />
          ) : (
            <h1 className="mt-0.5 font-display text-headline-md text-on-surface truncate">{task.title}</h1>
          )}
        </div>

        <div className="flex-none flex items-center gap-3 pt-4">
          <SaveIndicator state={etat} />
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-label-md font-semibold ${tone?.chip ?? ""}`}
          >
            <span className={`w-[6px] h-[6px] rounded-full ${tone?.dot ?? ""}`} />
            {task.etat_libelle ?? task.etat_code}
          </span>
        </div>
      </div>

      <nav className="flex items-center gap-1 border-b border-outline-soft mt-5 mb-5 overflow-x-auto">
        {sections.map((section) => {
          const active = pathname === section.href;
          return (
            <Link
              key={section.key}
              href={section.href}
              className={`inline-flex items-center gap-1.5 px-3 py-2.5 -mb-px border-b-2 whitespace-nowrap text-body-sm font-medium transition-colors ${
                active
                  ? "border-primary text-primary"
                  : "border-transparent text-on-surface-variant hover:text-on-surface"
              }`}
            >
              {section.icon}
              {section.label}
            </Link>
          );
        })}
      </nav>

      <TaskProvider value={{ task, phase, queue, saveState: etat, echec, oublierEchec, canManage }}>
        {children}
      </TaskProvider>
    </div>
  );
}

function BackToTasks({ projectId }: { projectId: number }) {
  return (
    <Link
      href={`/projects/${projectId}/tasks`}
      className="inline-flex items-center gap-1.5 text-body-sm font-medium text-on-surface-variant hover:text-primary transition-colors mb-4"
    >
      <ArrowBackOutlined style={{ fontSize: 15 }} /> Tâches
    </Link>
  );
}

function SaveIndicator({ state }: { state: EtatSauvegarde }) {
  if (state === "idle") return null;
  const map = {
    saving: { icon: <CloudSyncOutlined style={{ fontSize: 16 }} />, label: "Enregistrement…", tone: "text-on-surface-variant" },
    saved: { icon: <CloudDoneOutlined style={{ fontSize: 16 }} />, label: "Enregistré", tone: "text-secondary" },
    error: { icon: <CloudOffOutlined style={{ fontSize: 16 }} />, label: "Échec de l'enregistrement", tone: "text-error" },
  } as const;
  const { icon, label, tone } = map[state];
  return (
    <span className={`shrink-0 inline-flex items-center gap-1.5 text-label-md ${tone}`}>
      {icon}
      {label}
    </span>
  );
}
