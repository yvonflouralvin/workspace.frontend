"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { AddOutlined, ViewKanbanOutlined, ViewListOutlined } from "@mui/icons-material";
import { Toast } from "@repo/ui/Toast";
import { ViewModeSwitch } from "@repo/ui/ViewModeSwitch";
import { projectsApi, type Task } from "@/app/lib/projects-api";
import { useProject } from "@/app/(dashboard)/projects/[id]/project-context";
import { KanbanBoard } from "./KanbanBoard";
import { TaskListView } from "./TaskListView";
import { TaskDrawer } from "./TaskDrawer";

export type TasksMode = "kanban" | "liste";

const MODE_OPTIONS = [
  { value: "liste" as const, icon: <ViewListOutlined style={{ fontSize: 18 }} />, label: "Liste" },
  { value: "kanban" as const, icon: <ViewKanbanOutlined style={{ fontSize: 18 }} />, label: "Kanban" },
];

export function TasksView({
  mode,
  phaseId,
  modeSwitch,
}: {
  mode: TasksMode;
  phaseId?: number;
  /** Vue unique (onglet d'une phase) : le mode se choisit sur place plutôt que par la route. */
  modeSwitch?: boolean;
}) {
  const { projectId, project, tasks: allTasks, setTasks, reloadTasks, members, canManage } = useProject();
  // Vue de phase : on ne montre et ne crée que les éléments de cette phase.
  const tasks = phaseId ? allTasks.filter((t) => t.phase_id === phaseId) : allTasks;
  const [view, setView] = useState<TasksMode>(mode);
  const currentMode = modeSwitch ? view : mode;
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [editing, setEditing] = useState<Task | "new" | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    const t = searchParams.get("task");
    if (!t || !tasks.length) return;
    const found = tasks.find((x) => x.id === Number(t));
    if (found) setEditing(found);
  }, [searchParams, tasks]);

  async function moveTask(task: Task, status: string) {
    setTasks((cur) => cur.map((t) => (t.id === task.id ? { ...t, status } : t)));
    try {
      await projectsApi.updateTask(task.id, { status });
    } finally {
      reloadTasks();
    }
  }

  const current = editing === "new" ? null : editing;
  const subtasks = current ? tasks.filter((t) => t.parent_task_id === current.id) : [];

  return (
    <div className="space-y-4">
      {(modeSwitch || canManage) && (
        <div className="flex items-center justify-end gap-2">
          {modeSwitch && <ViewModeSwitch value={view} options={MODE_OPTIONS} onChange={setView} />}
          {canManage && (
            <button
              onClick={() => setEditing("new")}
              className="inline-flex items-center justify-center gap-1.5 h-11 md:h-[38px] px-4 rounded-lg bg-primary text-on-primary text-body-sm font-semibold shadow-button hover:bg-primary-container transition-colors whitespace-nowrap"
            >
              <AddOutlined style={{ fontSize: 16 }} />
              Nouvelle tâche
            </button>
          )}
        </div>
      )}

      {currentMode === "kanban" ? (
        <KanbanBoard
          tasks={tasks}
          canManage={canManage}
          onMove={moveTask}
          onOpen={setEditing}
          projectKey={project.key}
        />
      ) : (
        <TaskListView tasks={tasks} onOpen={setEditing} />
      )}

      {editing && (
        <TaskDrawer
          task={current}
          projectId={projectId}
          phaseId={phaseId}
          projectKey={project.key}
          subtasks={subtasks}
          members={members}
          canManage={canManage}
          onClose={() => {
            setEditing(null);
            if (searchParams.get("task")) router.replace(pathname);
          }}
          onSaved={() => {
            reloadTasks();
            setEditing(null);
            setToast("Tâche enregistrée.");
          }}
        />
      )}

      {toast && <Toast message={toast} onDismiss={() => setToast(null)} />}
    </div>
  );
}
