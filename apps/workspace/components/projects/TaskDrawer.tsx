"use client";

import { useState } from "react";
import { DeleteOutlineOutlined } from "@mui/icons-material";
import {
  PRIORITY_LABELS,
  PRIORITY_ORDER,
  STATUS_LABELS,
  STATUS_ORDER,
  projectsApi,
  type Task,
} from "@/app/lib/projects-api";
import type { Member } from "@/app/(dashboard)/projects/[id]/project-context";

const inputCls =
  "px-3 py-2 rounded-xl border border-outline-variant bg-surface-container-lowest text-sm text-on-surface focus:border-primary outline-none w-full disabled:opacity-60";

export function TaskDrawer({
  task,
  projectId,
  members,
  canManage,
  onClose,
  onSaved,
}: {
  task: Task | null;
  projectId: number;
  members: Member[];
  canManage: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [title, setTitle] = useState(task?.title ?? "");
  const [description, setDescription] = useState(task?.description ?? "");
  const [status, setStatus] = useState(task?.status ?? "A_FAIRE");
  const [priority, setPriority] = useState(task?.priority ?? "AUCUNE");
  const [assignee, setAssignee] = useState<string>(task?.assignee_user_id ? String(task.assignee_user_id) : "");
  const [dueDate, setDueDate] = useState(task?.due_date ? task.due_date.slice(0, 10) : "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  const readOnly = !canManage;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40" onClick={onClose}>
      <div
        className="w-full max-w-[28rem] h-full bg-surface-container-lowest border-l border-outline-variant p-6 space-y-4 overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-on-surface">{task ? "Tâche" : "Nouvelle tâche"}</h2>
          <button onClick={onClose} className="text-on-surface-variant hover:text-on-surface">
            ✕
          </button>
        </div>
        {error && <p className="text-sm text-error">{error}</p>}
        <input
          className={inputCls}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Titre de la tâche"
          disabled={readOnly}
          autoFocus
        />
        <textarea
          className={inputCls}
          rows={4}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Description…"
          disabled={readOnly}
        />
        <div className="grid grid-cols-2 gap-3">
          <Sel
            label="Statut"
            value={status}
            onChange={setStatus}
            options={STATUS_ORDER.map((s) => [s, STATUS_LABELS[s]!])}
            disabled={readOnly}
          />
          <Sel
            label="Priorité"
            value={priority}
            onChange={setPriority}
            options={PRIORITY_ORDER.map((p) => [p, PRIORITY_LABELS[p]!])}
            disabled={readOnly}
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-on-surface-variant">Assigné</label>
            <select
              className={inputCls}
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
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-on-surface-variant">Échéance</label>
            <input
              type="date"
              className={inputCls}
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              disabled={readOnly}
            />
          </div>
        </div>
        {!readOnly && (
          <div className="flex items-center justify-between pt-2">
            {task ? (
              <button
                onClick={remove}
                disabled={saving}
                className="inline-flex items-center gap-1.5 text-sm text-error hover:opacity-70"
              >
                <DeleteOutlineOutlined style={{ fontSize: 18 }} /> Supprimer
              </button>
            ) : (
              <span />
            )}
            <button
              onClick={save}
              disabled={saving}
              className="px-5 py-2 rounded-xl bg-primary text-on-primary text-sm font-medium disabled:opacity-50"
            >
              {saving ? "…" : "Enregistrer"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function Sel({
  label,
  value,
  onChange,
  options,
  disabled,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: [string, string][];
  disabled?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-medium text-on-surface-variant">{label}</label>
      <select className={inputCls} value={value} onChange={(e) => onChange(e.target.value)} disabled={disabled}>
        {options.map(([v, l]) => (
          <option key={v} value={v}>
            {l}
          </option>
        ))}
      </select>
    </div>
  );
}
