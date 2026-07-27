"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ConfirmDialog } from "@repo/ui/ConfirmDialog";
import { MultiSelect } from "@repo/ui/MultiSelect";
import { Toast } from "@repo/ui/Toast";
import {
  DELIVERABLE_STATUS_LABELS,
  DELIVERABLE_STATUS_ORDER,
  deliverablesOnPhase,
  deliverablesOnTask,
  projectsApi,
  type ProjectGroup,
  type ProjectMember,
} from "@/app/lib/projects-api";
import { useProject } from "../../../project-context";
import { useDeliverable } from "../deliverable-context";

const CONTROL =
  "h-9 px-2 rounded-lg border border-outline-soft bg-surface-container-lowest text-body-sm text-on-surface outline-none focus:border-primary transition-colors";

export default function DeliverableSettingsPage() {
  const { deliverable, phase, approvers, reload, canManage } = useDeliverable();
  const { projectId, tasks, isOwner } = useProject();
  const router = useRouter();

  const [members, setMembers] = useState<ProjectMember[]>([]);
  const [groups, setGroups] = useState<ProjectGroup[]>([]);
  const [title, setTitle] = useState(deliverable.title);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    projectsApi.listMembers(projectId).then(setMembers).catch(() => {});
    // Les groupes ne sont lisibles que par le propriétaire : sans eux, on ne
    // propose que des personnes.
    if (isOwner) projectsApi.listGroups(projectId).then(setGroups).catch(() => {});
  }, [projectId, isOwner]);

  const run = useCallback(
    async (fn: () => Promise<unknown>, message: string) => {
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
    },
    [reload]
  );

  const onPhase = phase ? deliverablesOnPhase(phase) : false;
  const onTask = phase ? deliverablesOnTask(phase) : false;
  const phaseTasks = tasks.filter((t) => t.phase_id === deliverable.phase_id && !t.parent_task_id);

  return (
    <div className="max-w-[820px] space-y-5">
      {error && (
        <p className="text-body-sm text-error bg-error-container/40 rounded-lg px-3 py-2">{error}</p>
      )}

      <div className="rounded-2xl border border-outline-soft bg-surface-container-lowest divide-y divide-hairline">
        <Row label="Intitulé">
          <input
            value={title}
            disabled={!canManage}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={() => {
              if (title.trim() && title.trim() !== deliverable.title) {
                void run(
                  () => projectsApi.updateDeliverable(deliverable.id, { title: title.trim() }),
                  "Intitulé mis à jour."
                );
              }
            }}
            className={`${CONTROL} w-[16rem] max-w-full`}
          />
        </Row>

        <Row label="État">
          <select
            value={deliverable.status}
            disabled={!canManage || busy}
            onChange={(e) =>
              run(
                () => projectsApi.updateDeliverable(deliverable.id, { status: e.target.value }),
                "État mis à jour."
              )
            }
            className={`${CONTROL} font-semibold`}
          >
            {DELIVERABLE_STATUS_ORDER.map((s) => (
              <option key={s} value={s}>
                {DELIVERABLE_STATUS_LABELS[s]}
              </option>
            ))}
          </select>
        </Row>

        <Row label="Échéance">
          <input
            type="date"
            value={deliverable.due_date ? deliverable.due_date.slice(0, 10) : ""}
            disabled={!canManage || busy}
            onChange={(e) =>
              run(
                () =>
                  projectsApi.updateDeliverable(deliverable.id, {
                    due_date: e.target.value ? new Date(e.target.value).toISOString() : null,
                  }),
                "Échéance mise à jour."
              )
            }
            className={CONTROL}
          />
        </Row>

        {onTask && (
          <Row label="Rattachement">
            <select
              value={deliverable.task_id ? String(deliverable.task_id) : ""}
              disabled={!canManage || busy}
              onChange={(e) =>
                run(
                  () =>
                    projectsApi.updateDeliverable(deliverable.id, {
                      task_id: e.target.value ? Number(e.target.value) : null,
                    }),
                  "Rattachement mis à jour."
                )
              }
              className={CONTROL}
            >
              {onPhase && <option value="">La phase</option>}
              {phaseTasks.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.title}
                </option>
              ))}
            </select>
          </Row>
        )}
      </div>

      <div className="rounded-2xl border border-outline-soft bg-surface-container-lowest p-4 space-y-3">
        <div>
          <h2 className="text-body-md font-semibold text-on-surface">Qui approuve ce livrable</h2>
          <p className="mt-0.5 text-body-sm text-on-surface-variant">
            Ces personnes et groupes décident du sort de chaque version soumise : approuver la
            fait accepter, rejeter la renvoie au travail.{" "}
            <strong>Sans approbateur désigné, la décision revient à qui peut écrire sur la phase</strong> —
            un livrable ne doit pas devenir indécidable par oubli de configuration.
          </p>
        </div>

        <div>
          <p className="text-label-sm uppercase text-outline mb-1.5">Personnes</p>
          <MultiSelect
            options={members.map((m) => ({ id: m.user_id, label: m.user_name ?? `#${m.user_id}` }))}
            selectedIds={approvers?.user_ids ?? []}
            onChange={(ids) =>
              run(
                () =>
                  projectsApi.setApprovers(deliverable.id, {
                    user_ids: ids.map(Number),
                    group_ids: approvers?.group_ids ?? [],
                  }),
                "Approbateurs mis à jour."
              )
            }
            placeholder="Choisir parmi les membres du projet…"
          />
        </div>

        {isOwner && (
          <div>
            <p className="text-label-sm uppercase text-outline mb-1.5">Groupes</p>
            <MultiSelect
              options={groups.map((g) => ({ id: g.id, label: g.name }))}
              selectedIds={approvers?.group_ids ?? []}
              onChange={(ids) =>
                run(
                  () =>
                    projectsApi.setApprovers(deliverable.id, {
                      user_ids: approvers?.user_ids ?? [],
                      group_ids: ids.map(Number),
                    }),
                  "Approbateurs mis à jour."
                )
              }
              placeholder="Choisir un groupe du projet…"
            />
          </div>
        )}

        {approvers && !approvers.user_ids.length && !approvers.group_ids.length && (
          <p className="text-label-md text-outline">
            Aucun approbateur désigné — toute personne pouvant écrire sur la phase peut décider.
          </p>
        )}
      </div>

      {canManage && (
        <button
          type="button"
          disabled={busy}
          onClick={() => setConfirmDelete(true)}
          className="h-9 px-4 rounded-lg border border-outline-soft text-body-sm font-semibold text-error hover:bg-error-container disabled:opacity-50 transition-colors"
        >
          Supprimer ce livrable
        </button>
      )}

      {confirmDelete && (
        <ConfirmDialog
          title={`Supprimer « ${deliverable.title} » ?`}
          message="Le livrable et son historique de versions seront retirés de la phase."
          confirmLabel="Supprimer"
          busy={busy}
          onConfirm={async () => {
            setConfirmDelete(false);
            setBusy(true);
            try {
              await projectsApi.deleteDeliverable(deliverable.id);
              router.push(`/projects/${projectId}/phases/${deliverable.phase_id}/deliverables`);
            } catch (e) {
              setError(e instanceof Error ? e.message : "Suppression impossible.");
              setBusy(false);
            }
          }}
          onCancel={() => setConfirmDelete(false)}
        />
      )}

      {toast && <Toast message={toast} onDismiss={() => setToast(null)} />}
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 px-4 py-3">
      <span className="text-body-sm text-on-surface-variant">{label}</span>
      {children}
    </div>
  );
}
