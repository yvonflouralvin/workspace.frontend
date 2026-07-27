"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { AddOutlined, DeleteOutlineOutlined } from "@mui/icons-material";
import { ConfirmDialog } from "@repo/ui/ConfirmDialog";
import { Toast } from "@repo/ui/Toast";
import {
  DELIVERABLE_STATUS_LABELS,
  DELIVERABLE_STATUS_ORDER,
  DELIVERABLE_STATUS_TONES,
  deliverablesOnPhase,
  deliverablesOnTask,
  projectsApi,
  type Deliverable,
  type Phase,
  type Task,
} from "@/app/lib/projects-api";

/** Rappel discret : l'historique et la décision vivent sur la page du livrable. */
function versionHint(row: Deliverable): string {
  return row.status === "LIVRE" ? " · en attente de décision" : "";
}

const FIELD =
  "h-9 px-2 rounded-lg border border-outline-soft bg-surface-container-lowest text-body-sm text-on-surface outline-none focus:border-primary transition-colors";

export function DeliverablesPanel({
  phase,
  tasks,
  canManage,
  /** Vue d'une tâche : n'affiche et ne crée que ses livrables. */
  taskId,
}: {
  phase: Phase;
  tasks: Task[];
  canManage: boolean;
  taskId?: number;
}) {
  const [rows, setRows] = useState<Deliverable[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [pendingRemoval, setPendingRemoval] = useState<Deliverable | null>(null);
  const [busy, setBusy] = useState(false);

  const [title, setTitle] = useState("");
  const [attachment, setAttachment] = useState<string>(taskId ? String(taskId) : "");
  const [dueDate, setDueDate] = useState("");

  const reload = useCallback(
    () =>
      projectsApi
        .listDeliverables(phase.id)
        .then((all) => setRows(taskId ? all.filter((d) => d.task_id === taskId) : all))
        .catch(() => setRows([])),
    [phase.id, taskId]
  );
  useEffect(() => {
    void reload();
  }, [reload]);

  const onPhase = deliverablesOnPhase(phase);
  const onTask = deliverablesOnTask(phase);
  const phaseTasks = tasks.filter((t) => t.phase_id === phase.id && !t.parent_task_id);

  async function run(fn: () => Promise<unknown>, message: string) {
    setBusy(true);
    setError(null);
    try {
      await fn();
      await reload();
      setToast(message);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Une erreur est survenue.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="max-w-[820px] space-y-4">
      {!taskId && (
        <p className="text-body-sm text-on-surface-variant">
          {onPhase && onTask
            ? "Les livrables de cette phase se rattachent à la phase elle-même ou à l'une de ses tâches."
            : onPhase
              ? "Les livrables de cette phase se rattachent à la phase."
              : "Les livrables de cette phase se rattachent chacun à une tâche."}
        </p>
      )}

      {error && (
        <p className="text-body-sm text-error bg-error-container/40 rounded-lg px-3 py-2">{error}</p>
      )}

      {canManage && (
        <div className="flex flex-col md:flex-row md:items-center gap-2">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Intitulé du livrable"
            className={`${FIELD} flex-1`}
          />
          {!taskId && onTask && (
            <select
              value={attachment}
              onChange={(e) => setAttachment(e.target.value)}
              className={FIELD}
              aria-label="Rattachement"
            >
              {onPhase && <option value="">La phase</option>}
              {phaseTasks.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.title}
                </option>
              ))}
            </select>
          )}
          <input
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            className={FIELD}
            aria-label="Échéance"
          />
          <button
            type="button"
            disabled={!title.trim() || busy || (!onPhase && !taskId && !attachment)}
            onClick={() =>
              run(async () => {
                await projectsApi.createDeliverable(phase.id, {
                  title: title.trim(),
                  task_id: taskId ?? (attachment ? Number(attachment) : null),
                  due_date: dueDate ? new Date(dueDate).toISOString() : null,
                });
                setTitle("");
                setDueDate("");
              }, "Livrable ajouté.")
            }
            className="inline-flex items-center justify-center gap-1.5 h-9 px-4 rounded-lg bg-primary text-on-primary text-body-sm font-semibold shadow-button hover:bg-primary-container disabled:opacity-50 transition-colors whitespace-nowrap"
          >
            <AddOutlined style={{ fontSize: 16 }} />
            Ajouter
          </button>
        </div>
      )}

      <div className="rounded-2xl border border-outline-soft bg-surface-container-lowest overflow-hidden">
        {rows === null && <p className="px-4 py-3 text-body-sm text-on-surface-variant">Chargement…</p>}
        {rows?.length === 0 && (
          <p className="px-4 py-3 text-body-sm text-on-surface-variant">Aucun livrable pour l&apos;instant.</p>
        )}
        {rows?.map((row) => {
          const tone = DELIVERABLE_STATUS_TONES[row.status] ?? DELIVERABLE_STATUS_TONES.A_PRODUIRE!;
          return (
            <div
              key={row.id}
              className="flex flex-wrap md:flex-nowrap items-center gap-x-3 gap-y-2 px-4 py-3 border-b border-hairline last:border-b-0"
            >
              <Link
                href={`/projects/${phase.project_id}/deliverables/${row.id}`}
                className="w-full md:flex-1 min-w-0 group"
              >
                <span className="block text-body-md font-medium text-on-surface truncate group-hover:text-primary transition-colors">
                  {row.title}
                </span>
                <span className="block text-label-md text-outline truncate">
                  {row.task_title ? `Tâche · ${row.task_title}` : "Phase"}
                  {versionHint(row)}
                </span>
              </Link>

              {canManage ? (
                <select
                  value={row.status}
                  disabled={busy}
                  onChange={(e) =>
                    run(
                      () => projectsApi.updateDeliverable(row.id, { status: e.target.value }),
                      "Statut mis à jour."
                    )
                  }
                  className="h-8 rounded-lg border border-outline-soft bg-surface-container-lowest px-2 text-body-sm font-semibold text-on-surface outline-none focus:border-primary"
                >
                  {DELIVERABLE_STATUS_ORDER.map((s) => (
                    <option key={s} value={s}>
                      {DELIVERABLE_STATUS_LABELS[s]}
                    </option>
                  ))}
                </select>
              ) : (
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-label-md font-semibold ${tone.chip}`}
                >
                  <span className={`w-[6px] h-[6px] rounded-full ${tone.dot}`} />
                  {DELIVERABLE_STATUS_LABELS[row.status] ?? row.status}
                </span>
              )}

              <span className="w-[110px] flex-none text-label-md text-on-surface-variant">
                {row.due_date
                  ? new Date(row.due_date).toLocaleDateString("fr-FR", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    })
                  : "—"}
              </span>

              {canManage && (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => setPendingRemoval(row)}
                  aria-label={`Supprimer ${row.title}`}
                  className="w-8 h-8 flex-none flex items-center justify-center rounded-lg text-on-surface-variant hover:bg-error-container hover:text-error disabled:opacity-40 transition-colors"
                >
                  <DeleteOutlineOutlined style={{ fontSize: 17 }} />
                </button>
              )}
            </div>
          );
        })}
      </div>

      {pendingRemoval && (
        <ConfirmDialog
          title={`Supprimer « ${pendingRemoval.title} » ?`}
          message="Ce livrable sera retiré de la phase."
          confirmLabel="Supprimer"
          busy={busy}
          onConfirm={async () => {
            const target = pendingRemoval;
            setPendingRemoval(null);
            await run(() => projectsApi.deleteDeliverable(target.id), "Livrable supprimé.");
          }}
          onCancel={() => setPendingRemoval(null)}
        />
      )}

      {toast && <Toast message={toast} onDismiss={() => setToast(null)} />}
    </div>
  );
}
