"use client";

import { STATUS_LABELS, STATUS_ORDER, STATUS_TONES, type Task } from "@/app/lib/projects-api";
import { TaskRow } from "./TaskRow";

export function TaskListView({
  tasks,
  onOpen,
}: {
  tasks: Task[];
  onOpen: (t: Task) => void;
}) {
  const roots = tasks.filter((t) => !t.parent_task_id);

  return (
    <div className="space-y-5">
      {STATUS_ORDER.map((status) => {
        const rows = roots.filter((t) => t.status === status);
        if (rows.length === 0) return null;
        const tone = STATUS_TONES[status];
        return (
          <div key={status}>
            <h3 className="flex items-center gap-2 text-label-sm uppercase text-outline mb-2">
              <span className={`w-2 h-2 rounded-full ${tone?.dot ?? ""}`} />
              {STATUS_LABELS[status]}
              <span className="text-outline-variant">·</span>
              {rows.length}
            </h3>
            <div className="rounded-2xl border border-outline-soft bg-surface-container-lowest overflow-hidden">
              {rows.map((t, i) => (
                <TaskRow key={t.id} task={t} index={i} onOpen={onOpen} />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
