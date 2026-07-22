"use client";

import { ScheduleOutlined } from "@mui/icons-material";
import {
  PRIORITY_LABELS,
  STATUS_LABELS,
  STATUS_ORDER,
  priorityTone,
  type Task,
} from "@/app/lib/projects-api";

export function TaskListView({
  tasks,
  onOpen,
  projectKey,
}: {
  tasks: Task[];
  onOpen: (t: Task) => void;
  projectKey: string;
}) {
  return (
    <div className="space-y-5">
      {STATUS_ORDER.map((status) => {
        const rows = tasks.filter((t) => t.status === status);
        if (rows.length === 0) return null;
        return (
          <div key={status}>
            <h3 className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider mb-2">
              {STATUS_LABELS[status]} · {rows.length}
            </h3>
            <div className="rounded-2xl border border-outline-variant overflow-hidden">
              {rows.map((t, i) => (
                <button
                  key={t.id}
                  onClick={() => onOpen(t)}
                  className={`w-full text-left flex items-center gap-3 px-4 py-3 border-b border-outline-variant last:border-0 hover:bg-surface-container-low ${i % 2 === 0 ? "bg-surface-container-lowest" : "bg-surface-container-low/50"}`}
                >
                  <span className="text-xs font-mono text-on-surface-variant w-16 shrink-0">
                    {projectKey}-{t.number}
                  </span>
                  <span className="flex-1 text-sm text-on-surface truncate">{t.title}</span>
                  {t.priority !== "AUCUNE" && (
                    <span className={`text-xs ${priorityTone(t.priority)}`}>{PRIORITY_LABELS[t.priority]}</span>
                  )}
                  {t.assignee_name && <span className="text-xs text-on-surface-variant">{t.assignee_name}</span>}
                  {t.due_date && (
                    <span className="text-xs text-on-surface-variant flex items-center gap-1">
                      <ScheduleOutlined style={{ fontSize: 13 }} />
                      {new Date(t.due_date).toLocaleDateString("fr-FR", { day: "2-digit", month: "short" })}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
