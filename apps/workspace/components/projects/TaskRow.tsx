"use client";

import Link from "next/link";
import { ScheduleOutlined } from "@mui/icons-material";
import { PriorityBars } from "@repo/ui/PriorityBars";
import {
  PRIORITY_LABELS,
  PRIORITY_LEVELS,
  STATUS_LABELS,
  STATUS_TONES,
  type Task,
} from "@/app/lib/projects-api";

export function isOverdue(task: Task): boolean {
  return Boolean(task.due_date) && new Date(task.due_date!).getTime() < Date.now();
}

/** Ligne zébrée partagée par « Mes tâches » et la section Tâches d'un projet. */
export function TaskRow({
  task,
  index,
  href,
  onOpen,
}: {
  task: Task;
  index: number;
  href?: string;
  onOpen?: (task: Task) => void;
}) {
  const tone = STATUS_TONES[task.status];
  const overdue = isOverdue(task);

  const content = (
    <>
      <span className="w-16 flex-none font-mono text-label-md text-outline">
        {task.project_key}-{task.number}
      </span>
      <span className="flex-1 min-w-0 truncate text-left text-body-md text-on-surface">
        {task.title}
      </span>
      {task.priority !== "AUCUNE" && (
        <span className="flex-none inline-flex items-center gap-1.5">
          <PriorityBars
            level={PRIORITY_LEVELS[task.priority] ?? 0}
            label={PRIORITY_LABELS[task.priority]}
          />
        </span>
      )}
      <span
        className={`flex-none inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-[11px] font-semibold ${tone?.chip ?? ""}`}
      >
        <span className={`w-1.5 h-1.5 rounded-full ${tone?.dot ?? ""}`} />
        {STATUS_LABELS[task.status]}
      </span>
      <span
        className={`w-[86px] flex-none inline-flex items-center justify-end gap-1 text-label-md ${
          overdue ? "text-error font-semibold" : "text-outline"
        }`}
      >
        {task.due_date && (
          <>
            <ScheduleOutlined style={{ fontSize: 13 }} />
            {new Date(task.due_date).toLocaleDateString("fr-FR", {
              day: "2-digit",
              month: "short",
            })}
          </>
        )}
      </span>
    </>
  );

  const className = `w-full flex items-center gap-3 px-4 py-3 border-b border-hairline last:border-b-0 hover:bg-surface-container-low transition-colors ${
    index % 2 === 1 ? "bg-surface-row-alt" : ""
  }`;

  if (href) {
    return (
      <Link href={href} className={className}>
        {content}
      </Link>
    );
  }
  return (
    <button type="button" onClick={() => onOpen?.(task)} className={className}>
      {content}
    </button>
  );
}
