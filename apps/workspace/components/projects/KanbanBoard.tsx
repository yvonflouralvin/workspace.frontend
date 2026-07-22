"use client";

import { useState } from "react";
import {
  PRIORITY_LABELS,
  STATUS_LABELS,
  STATUS_ORDER,
  priorityTone,
  type Task,
} from "@/app/lib/projects-api";

export function KanbanBoard({
  tasks,
  canManage,
  onMove,
  onOpen,
  projectKey,
}: {
  tasks: Task[];
  canManage: boolean;
  onMove: (t: Task, s: string) => void;
  onOpen: (t: Task) => void;
  projectKey: string;
}) {
  const [drag, setDrag] = useState<Task | null>(null);
  return (
    <div className="flex gap-3 overflow-x-auto pb-2">
      {STATUS_ORDER.map((status) => {
        const col = tasks.filter((t) => t.status === status);
        return (
          <div
            key={status}
            onDragOver={(e) => {
              if (drag) e.preventDefault();
            }}
            onDrop={() => {
              if (drag && drag.status !== status) onMove(drag, status);
              setDrag(null);
            }}
            className="w-72 shrink-0 rounded-2xl bg-surface-container/50 border border-outline-variant p-2"
          >
            <div className="flex items-center justify-between px-2 py-1.5">
              <span className="text-sm font-medium text-on-surface-variant">{STATUS_LABELS[status]}</span>
              <span className="text-xs text-on-surface-variant/60">{col.length}</span>
            </div>
            <div className="space-y-2 min-h-[40px]">
              {col.map((t) => (
                <div
                  key={t.id}
                  draggable={canManage}
                  onDragStart={() => setDrag(t)}
                  onDragEnd={() => setDrag(null)}
                  onClick={() => onOpen(t)}
                  className="rounded-xl bg-surface-container-lowest border border-outline-variant p-3 cursor-pointer hover:border-primary/40"
                >
                  <p className="text-sm text-on-surface">{t.title}</p>
                  <div className="flex items-center gap-2 mt-2 text-xs text-on-surface-variant">
                    <span className="font-mono">
                      {projectKey}-{t.number}
                    </span>
                    {t.priority !== "AUCUNE" && (
                      <span className={priorityTone(t.priority)}>· {PRIORITY_LABELS[t.priority]}</span>
                    )}
                    {t.assignee_name && (
                      <span className="ml-auto w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px] font-semibold">
                        {t.assignee_name.slice(0, 2).toUpperCase()}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
