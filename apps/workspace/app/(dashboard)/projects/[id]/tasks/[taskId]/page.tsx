"use client";

import { TagInput } from "@repo/ui/TagInput";
import {
  PRIORITY_LABELS,
  PRIORITY_ORDER,
  STATUS_LABELS,
  STATUS_ORDER,
  phasesVisible,
  projectsApi,
} from "@/app/lib/projects-api";
import { useProject } from "../../project-context";
import { useTask } from "./task-context";

const LABEL = "block text-label-sm uppercase text-outline";
const CONTROL =
  "h-8 rounded-lg border border-outline-soft bg-surface-container-lowest px-2 text-body-sm text-on-surface outline-none focus:border-primary";

export default function TaskOverviewPage() {
  const { task, queue, canManage } = useTask();
  const { tasks, phases, members } = useProject();
  const subtasks = tasks.filter((t) => t.parent_task_id === task.id);
  const selectablePhases = phasesVisible(phases) ? phases : [];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-6 items-start">
      <div>
        <p className={`${LABEL} mb-2`}>Description</p>
        <textarea
          defaultValue={task.description ?? ""}
          disabled={!canManage}
          onChange={(e) => queue({ description: e.target.value })}
          placeholder="Ce qu'il y a à faire, le contexte, les critères d'acceptation…"
          className="w-full min-h-[14rem] rounded-2xl border border-outline-soft bg-surface-container-lowest px-4 py-3 text-body-md text-on-surface outline-none focus:border-primary transition-colors resize-y disabled:opacity-60"
        />

        <p className={`${LABEL} mt-6 mb-2`}>
          Sous-tâches{" "}
          {subtasks.length > 0 && (
            <span className="normal-case tracking-normal text-outline">
              {subtasks.filter((s) => s.status === "TERMINE").length}/{subtasks.length}
            </span>
          )}
        </p>
        <div className="rounded-2xl border border-outline-soft bg-surface-container-lowest overflow-hidden">
          {subtasks.length === 0 && (
            <p className="px-4 py-3 text-body-sm text-on-surface-variant">Aucune sous-tâche.</p>
          )}
          {subtasks.map((subtask) => (
            <div
              key={subtask.id}
              className="flex items-center gap-3 px-4 py-2.5 border-b border-hairline last:border-b-0"
            >
              <span
                className={`flex-1 min-w-0 truncate text-body-sm ${
                  subtask.status === "TERMINE" ? "text-outline line-through" : "text-on-surface"
                }`}
              >
                {subtask.title}
              </span>
              <span className="text-label-md text-outline">{STATUS_LABELS[subtask.status]}</span>
            </div>
          ))}
        </div>
      </div>

      <aside className="rounded-2xl border border-outline-soft bg-surface-container-lowest divide-y divide-hairline">
        <MetaRow label="Statut">
          <select
            value={task.status}
            disabled={!canManage}
            onChange={(e) => queue({ status: e.target.value })}
            className={`${CONTROL} font-semibold`}
          >
            {STATUS_ORDER.map((s) => (
              <option key={s} value={s}>
                {STATUS_LABELS[s]}
              </option>
            ))}
          </select>
        </MetaRow>

        <MetaRow label="Priorité">
          <select
            value={task.priority}
            disabled={!canManage}
            onChange={(e) => queue({ priority: e.target.value })}
            className={CONTROL}
          >
            {PRIORITY_ORDER.map((p) => (
              <option key={p} value={p}>
                {PRIORITY_LABELS[p]}
              </option>
            ))}
          </select>
        </MetaRow>

        <MetaRow label="Assigné">
          <select
            value={task.assignee_user_id ? String(task.assignee_user_id) : ""}
            disabled={!canManage}
            onChange={(e) => queue({ assignee_user_id: e.target.value ? Number(e.target.value) : null })}
            className={CONTROL}
          >
            <option value="">Non assigné</option>
            {members.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
        </MetaRow>

        <MetaRow label="Échéance">
          <input
            type="date"
            value={task.due_date ? task.due_date.slice(0, 10) : ""}
            disabled={!canManage}
            onChange={(e) =>
              queue({ due_date: e.target.value ? new Date(e.target.value).toISOString() : null })
            }
            className={CONTROL}
          />
        </MetaRow>

        {selectablePhases.length > 1 && (
          <MetaRow label="Phase">
            <select
              value={String(task.phase_id)}
              disabled={!canManage}
              onChange={(e) => {
                // Déplacement immédiat : la sauvegarde différée masquerait le fait
                // que les sous-tâches suivent.
                void projectsApi
                  .updateTask(task.id, { phase_id: Number(e.target.value) })
                  .finally(() => queue({}));
              }}
              className={CONTROL}
            >
              {selectablePhases.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </MetaRow>
        )}

        <div className="px-4 py-3">
          <p className="text-body-sm text-on-surface-variant mb-1.5">Étiquettes</p>
          <TagInput
            value={task.tags ?? []}
            disabled={!canManage}
            onChange={(tags) => queue({ tags })}
            placeholder="Urgent, Client…"
          />
        </div>
      </aside>
    </div>
  );
}

function MetaRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 px-4 py-3">
      <span className="text-body-sm text-on-surface-variant">{label}</span>
      {children}
    </div>
  );
}
