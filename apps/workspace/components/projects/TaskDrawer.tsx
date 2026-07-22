"use client";

import { useState } from "react";
import { AddOutlined, CheckOutlined } from "@mui/icons-material";
import { RightDrawer } from "@repo/ui/RightDrawer";
import {
  PRIORITY_LABELS,
  PRIORITY_ORDER,
  STATUS_LABELS,
  STATUS_ORDER,
  STATUS_TONES,
  projectsApi,
  type Task,
} from "@/app/lib/projects-api";
import type { Member } from "@/app/(dashboard)/projects/[id]/project-context";

const FIELD =
  "w-full rounded-lg border border-outline-soft bg-surface-container-lowest text-body-md text-on-surface outline-none focus:border-primary transition-colors disabled:opacity-60";
const LABEL = "block text-label-sm uppercase text-outline mb-1.5";

export function TaskDrawer({
  task,
  projectId,
  projectKey,
  subtasks,
  members,
  canManage,
  onClose,
  onSaved,
}: {
  task: Task | null;
  projectId: number;
  projectKey: string;
  subtasks: Task[];
  members: Member[];
  canManage: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [title, setTitle] = useState(task?.title ?? "");
  const [description, setDescription] = useState(task?.description ?? "");
  const [status, setStatus] = useState(task?.status ?? "A_FAIRE");
  const [priority, setPriority] = useState(task?.priority ?? "AUCUNE");
  const [assignee, setAssignee] = useState<string>(
    task?.assignee_user_id ? String(task.assignee_user_id) : ""
  );
  const [dueDate, setDueDate] = useState(task?.due_date ? task.due_date.slice(0, 10) : "");
  const [newSubtask, setNewSubtask] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const readOnly = !canManage;
  const tone = STATUS_TONES[status];

  async function save() {
    setError(null);
    if (!title.trim()) {
      setError("Le titre est requis.");
      return;
    }
    setSaving(true);
    const body = {
      title: title.trim(),
      description: description.trim() || null,
      status,
      priority,
      assignee_user_id: assignee ? Number(assignee) : null,
      due_date: dueDate ? new Date(dueDate).toISOString() : null,
    };
    try {
      if (task) await projectsApi.updateTask(task.id, body);
      else await projectsApi.createTask({ project_id: projectId, ...body });
      onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Enregistrement impossible.");
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (!task) return;
    setSaving(true);
    try {
      await projectsApi.deleteTask(task.id);
      onSaved();
    } finally {
      setSaving(false);
    }
  }

  async function toggleSubtask(subtask: Task) {
    await projectsApi.updateTask(subtask.id, {
      status: subtask.status === "TERMINE" ? "A_FAIRE" : "TERMINE",
    });
    onSaved();
  }

  async function addSubtask() {
    if (!task || !newSubtask.trim()) return;
    await projectsApi.createTask({
      project_id: projectId,
      title: newSubtask.trim(),
      parent_task_id: task.id,
    });
    setNewSubtask("");
    onSaved();
  }

  return (
    <RightDrawer
      title={task ? `${projectKey}-${task.number}` : "Nouvelle tâche"}
      onClose={onClose}
      width="w-[448px] max-w-[92vw]"
      footer={
        readOnly ? undefined : (
          <>
            {task && (
              <button
                onClick={remove}
                disabled={saving}
                className="h-[34px] px-3 rounded-lg text-label-md font-semibold text-error hover:bg-error-container transition-colors"
              >
                Supprimer
              </button>
            )}
            <button
              onClick={save}
              disabled={saving}
              className="ml-auto h-[34px] px-4 rounded-lg bg-primary text-on-primary text-label-md font-semibold shadow-button hover:bg-primary-container disabled:opacity-50 transition-colors"
            >
              {saving ? "…" : "Enregistrer"}
            </button>
          </>
        )
      }
    >
      {task && (
        <span
          className={`inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-[11px] font-semibold mb-3 ${tone?.chip ?? ""}`}
        >
          <span className={`w-1.5 h-1.5 rounded-full ${tone?.dot ?? ""}`} />
          {STATUS_LABELS[status]}
        </span>
      )}

      {error && <p className="text-body-sm text-error mb-3">{error}</p>}

      <input
        className={`${FIELD} h-[38px] px-3 font-display text-body-lg font-semibold`}
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Titre de la tâche"
        disabled={readOnly}
        autoFocus
      />

      <p className={`${LABEL} mt-4`}>Description</p>
      <textarea
        className={`${FIELD} px-3 py-2.5 resize-none`}
        rows={4}
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="Description…"
        disabled={readOnly}
      />

      <div className="grid grid-cols-2 gap-3 mt-4">
        <Field label="Statut">
          <select
            className={`${FIELD} h-[38px] px-2`}
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            disabled={readOnly}
          >
            {STATUS_ORDER.map((s) => (
              <option key={s} value={s}>
                {STATUS_LABELS[s]}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Priorité">
          <select
            className={`${FIELD} h-[38px] px-2`}
            value={priority}
            onChange={(e) => setPriority(e.target.value)}
            disabled={readOnly}
          >
            {PRIORITY_ORDER.map((p) => (
              <option key={p} value={p}>
                {PRIORITY_LABELS[p]}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Assigné">
          <select
            className={`${FIELD} h-[38px] px-2`}
            value={assignee}
            onChange={(e) => setAssignee(e.target.value)}
            disabled={readOnly}
          >
            <option value="">Non assigné</option>
            {members.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Échéance">
          <input
            type="date"
            className={`${FIELD} h-[38px] px-2`}
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            disabled={readOnly}
          />
        </Field>
      </div>

      {task && (
        <>
          <p className={`${LABEL} mt-5`}>
            Sous-tâches{" "}
            {subtasks.length > 0 && (
              <span className="normal-case tracking-normal text-outline">
                {subtasks.filter((s) => s.status === "TERMINE").length}/{subtasks.length}
              </span>
            )}
          </p>
          <div className="rounded-xl border border-outline-soft overflow-hidden">
            {subtasks.length === 0 && (
              <p className="px-3 py-2.5 text-body-sm text-on-surface-variant">Aucune sous-tâche.</p>
            )}
            {subtasks.map((subtask) => {
              const done = subtask.status === "TERMINE";
              return (
                <div
                  key={subtask.id}
                  className="flex items-center gap-2.5 px-3 py-2.5 border-b border-hairline last:border-b-0"
                >
                  <button
                    type="button"
                    disabled={readOnly}
                    onClick={() => toggleSubtask(subtask)}
                    aria-label={done ? "Rouvrir" : "Terminer"}
                    className={`w-[18px] h-[18px] flex-none rounded-[5px] flex items-center justify-center transition-colors ${
                      done
                        ? "bg-primary text-on-primary"
                        : "border-[1.5px] border-outline-variant hover:border-primary"
                    }`}
                  >
                    {done && <CheckOutlined style={{ fontSize: 12 }} />}
                  </button>
                  <span
                    className={`flex-1 min-w-0 truncate text-body-sm ${
                      done ? "text-outline line-through" : "text-on-surface"
                    }`}
                  >
                    {subtask.title}
                  </span>
                  {subtask.estimate != null && (
                    <span className="text-label-md text-outline">{subtask.estimate} pts</span>
                  )}
                </div>
              );
            })}
          </div>

          {!readOnly && (
            <div className="flex gap-2 mt-2">
              <input
                value={newSubtask}
                onChange={(e) => setNewSubtask(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    void addSubtask();
                  }
                }}
                placeholder="Ajouter une sous-tâche…"
                className={`${FIELD} h-9 px-3 text-body-sm`}
              />
              <button
                type="button"
                onClick={addSubtask}
                disabled={!newSubtask.trim()}
                aria-label="Ajouter la sous-tâche"
                className="w-9 h-9 flex-none flex items-center justify-center rounded-lg border border-outline-soft text-on-surface-variant hover:bg-surface-container-low disabled:opacity-40 transition-colors"
              >
                <AddOutlined style={{ fontSize: 17 }} />
              </button>
            </div>
          )}
        </>
      )}
    </RightDrawer>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className={LABEL}>{label}</p>
      {children}
    </div>
  );
}
