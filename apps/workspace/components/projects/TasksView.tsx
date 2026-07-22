"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { AddOutlined } from "@mui/icons-material";
import { projectsApi, type Task } from "@/app/lib/projects-api";
import { useProject } from "@/app/(dashboard)/projects/[id]/project-context";
import { KanbanBoard } from "./KanbanBoard";
import { TaskListView } from "./TaskListView";
import { TaskDrawer } from "./TaskDrawer";

export function TasksView({ mode }: { mode: "kanban" | "liste" }) {
  const { projectId, project, tasks, setTasks, reloadTasks, members, canManage } = useProject();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [editing, setEditing] = useState<Task | "new" | null>(null);

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

  return (
    <div className="space-y-4">
      {canManage && (
        <div className="flex justify-end">
          <button
            onClick={() => setEditing("new")}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-on-primary text-sm font-medium"
          >
            <AddOutlined style={{ fontSize: 18 }} /> Nouvelle tâche
          </button>
        </div>
      )}

      {mode === "kanban" ? (
        <KanbanBoard
          tasks={tasks}
          canManage={canManage}
          onMove={moveTask}
          onOpen={setEditing}
          projectKey={project.key}
        />
      ) : (
        <TaskListView tasks={tasks} onOpen={setEditing} projectKey={project.key} />
      )}

      {editing && (
        <TaskDrawer
          task={editing === "new" ? null : editing}
          projectId={projectId}
          members={members}
          canManage={canManage}
          onClose={() => {
            setEditing(null);
            if (searchParams.get("task")) router.replace(pathname);
          }}
          onSaved={() => {
            reloadTasks();
            setEditing(null);
          }}
        />
      )}
    </div>
  );
}
