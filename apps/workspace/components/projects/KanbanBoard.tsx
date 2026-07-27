"use client";

import { useState } from "react";
import { AccountTreeOutlined, ChecklistOutlined, ScheduleOutlined } from "@mui/icons-material";
import { Avatar } from "@repo/ui/Avatar";
import { PriorityBars } from "@repo/ui/PriorityBars";
import {
  PRIORITY_LABELS,
  PRIORITY_LEVELS,
  STATUS_LABELS,
  STATUS_ORDER,
  STATUS_TONES,
  type Task,
} from "@/app/lib/projects-api";
import { isOverdue } from "./TaskRow";

export function KanbanBoard({
  tasks,
  canManage,
  onMove,
  onOpen,
  projectKey,
  phaseNames,
}: {
  tasks: Task[];
  canManage: boolean;
  onMove: (t: Task, s: string) => void;
  onOpen: (t: Task) => void;
  projectKey: string;
  /** Noms de phase à afficher sur les cartes — absent quand la vue est déjà
   *  celle d'une phase, ou quand le projet n'expose pas ses phases. */
  phaseNames?: Record<number, string>;
}) {
  const [drag, setDrag] = useState<Task | null>(null);
  const [over, setOver] = useState<string | null>(null);

  // Les sous-tâches vivent dans leur carte parente, pas comme cartes autonomes.
  const roots = tasks.filter((t) => !t.parent_task_id);
  const childCount = (task: Task) => tasks.filter((t) => t.parent_task_id === task.id);

  return (
    <div className="flex gap-3 overflow-x-auto pb-2 snap-x snap-mandatory md:snap-none -mx-4 px-4 md:mx-0 md:px-0">
      {STATUS_ORDER.map((status) => {
        const col = roots.filter((t) => t.status === status);
        const tone = STATUS_TONES[status];
        return (
          <div
            key={status}
            onDragOver={(e) => {
              if (drag) {
                e.preventDefault();
                setOver(status);
              }
            }}
            onDragLeave={() => setOver((s) => (s === status ? null : s))}
            onDrop={() => {
              if (drag && drag.status !== status) onMove(drag, status);
              setDrag(null);
              setOver(null);
            }}
            className={`w-[85vw] max-w-[300px] md:w-72 shrink-0 snap-center md:snap-align-none rounded-2xl bg-surface-container/50 p-3 transition-colors ${
              over === status ? "ring-2 ring-primary/40" : ""
            }`}
          >
            <div className="flex items-center gap-2 px-1 pb-2.5">
              <span className={`w-2 h-2 rounded-full ${tone?.dot ?? ""}`} />
              <span className="flex-1 text-body-sm font-semibold text-on-surface-variant">
                {STATUS_LABELS[status]}
              </span>
              <span className="text-label-md text-outline">{col.length}</span>
            </div>

            <div className="space-y-2 min-h-[40px]">
              {col.map((t) => {
                const children = childCount(t);
                const doneChildren = children.filter((c) => c.status === "TERMINE").length;
                const overdue = isOverdue(t);
                const phaseName = phaseNames?.[t.phase_id];
                return (
                  <div
                    key={t.id}
                    draggable={canManage}
                    onDragStart={() => setDrag(t)}
                    onDragEnd={() => {
                      setDrag(null);
                      setOver(null);
                    }}
                    onClick={() => onOpen(t)}
                    className="rounded-xl bg-surface-container-lowest border border-outline-soft shadow-card p-3 cursor-pointer hover:border-primary/40 transition-colors"
                  >
                    <p className="text-body-md font-medium text-on-surface">{t.title}</p>

                    {phaseName && (
                      <span
                        title={phaseName}
                        className="flex items-center gap-1 mt-0.5 text-label-md text-outline"
                      >
                        <AccountTreeOutlined style={{ fontSize: 13 }} className="flex-none" />
                        <span className="truncate">{phaseName}</span>
                      </span>
                    )}

                    {overdue && (
                      <span className="inline-flex items-center gap-1 mt-2 rounded-md bg-error-container px-1.5 py-0.5 text-[11px] font-semibold text-on-error-container">
                        <ScheduleOutlined style={{ fontSize: 12 }} />
                        En retard
                      </span>
                    )}

                    <div className="flex items-center gap-2 mt-2 text-label-md text-outline">
                      <span className="font-mono">
                        {projectKey}-{t.number}
                      </span>
                      {t.priority !== "AUCUNE" && (
                        <PriorityBars
                          level={PRIORITY_LEVELS[t.priority] ?? 0}
                          label={PRIORITY_LABELS[t.priority]}
                        />
                      )}
                      {children.length > 0 && (
                        <span className="inline-flex items-center gap-1">
                          <ChecklistOutlined style={{ fontSize: 13 }} />
                          {doneChildren}/{children.length}
                        </span>
                      )}
                      {t.assignee_name && (
                        <span className="ml-auto">
                          <Avatar name={t.assignee_name} size={20} />
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
