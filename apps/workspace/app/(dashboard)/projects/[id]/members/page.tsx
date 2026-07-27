"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AddOutlined, PersonRemoveOutlined } from "@mui/icons-material";
import { Avatar } from "@repo/ui/Avatar";
import { ConfirmDialog } from "@repo/ui/ConfirmDialog";
import { SearchSelect } from "@repo/ui/SearchSelect";
import { Toast } from "@repo/ui/Toast";
import {
  PROJECT_ROLE_HINTS,
  PROJECT_ROLE_LABELS,
  PROJECT_ROLE_ORDER,
  projectsApi,
  type ProjectMember,
  type ProjectRole,
} from "@/app/lib/projects-api";
import { useProject, type Member } from "../project-context";

export default function ProjectMembersPage() {
  const { projectId, members: workspaceMembers, isOwner } = useProject();

  const [rows, setRows] = useState<ProjectMember[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [pendingRemoval, setPendingRemoval] = useState<ProjectMember | null>(null);
  const [newUser, setNewUser] = useState<number | null>(null);
  const [newRole, setNewRole] = useState<ProjectRole>("MEMBER");
  const [busy, setBusy] = useState(false);

  const reload = useCallback(
    () => projectsApi.listMembers(projectId).then(setRows).catch(() => setRows([])),
    [projectId]
  );
  useEffect(() => {
    void reload();
  }, [reload]);

  // Un membre du workspace déjà dans le projet ne doit pas être proposé deux fois.
  const candidates = useMemo(
    () => workspaceMembers.filter((m) => !(rows ?? []).some((r) => r.user_id === m.id)),
    [workspaceMembers, rows]
  );
  const fetchCandidates = useCallback(
    async (query: string) =>
      candidates.filter((m) => m.name.toLowerCase().includes(query.trim().toLowerCase())),
    [candidates]
  );

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
    <div className="max-w-[820px] space-y-5">
      <div>
        <h2 className="font-display text-headline-sm text-on-surface">Membres du projet</h2>
        <p className="mt-1 text-body-sm text-on-surface-variant">
          Qui accède à ce projet, et avec quels droits. Ces rôles s&apos;ajoutent aux
          permissions du workspace : sans accès au module Projets, un utilisateur ne voit
          rien, quel que soit son rôle ici.
        </p>
      </div>

      {error && (
        <p className="text-body-sm text-error bg-error-container/40 rounded-lg px-3 py-2">{error}</p>
      )}

      {isOwner && (
        <div className="rounded-2xl border border-outline-soft bg-surface-container-lowest p-4">
          <p className="text-label-sm uppercase text-outline mb-2">Ajouter un membre</p>
          <div className="flex flex-col md:flex-row md:items-center gap-2">
            <div className="flex-1 min-w-0">
              <SearchSelect<Member>
                fetchOptions={fetchCandidates}
                value={newUser}
                onChange={(value) => setNewUser(value === null ? null : Number(value))}
                getOptionLabel={(m) => m.name}
                placeholder="Rechercher un membre du workspace…"
              />
            </div>
            <select
              value={newRole}
              onChange={(e) => setNewRole(e.target.value as ProjectRole)}
              className="h-[38px] px-2 rounded-lg border border-outline-soft bg-surface-container-lowest text-body-sm text-on-surface outline-none focus:border-primary"
            >
              {PROJECT_ROLE_ORDER.map((r) => (
                <option key={r} value={r}>
                  {PROJECT_ROLE_LABELS[r]}
                </option>
              ))}
            </select>
            <button
              type="button"
              disabled={!newUser || busy}
              onClick={() =>
                run(async () => {
                  await projectsApi.addMember(projectId, { user_id: newUser!, role: newRole });
                  setNewUser(null);
                }, "Membre ajouté.")
              }
              className="inline-flex items-center justify-center gap-1.5 h-[38px] px-4 rounded-lg bg-primary text-on-primary text-body-sm font-semibold shadow-button hover:bg-primary-container disabled:opacity-50 transition-colors whitespace-nowrap"
            >
              <AddOutlined style={{ fontSize: 16 }} />
              Ajouter
            </button>
          </div>
          <p className="mt-2 text-label-md text-outline">{PROJECT_ROLE_HINTS[newRole]}</p>
        </div>
      )}

      <div className="rounded-2xl border border-outline-soft bg-surface-container-lowest overflow-hidden">
        {rows === null && (
          <p className="px-4 py-3 text-body-sm text-on-surface-variant">Chargement…</p>
        )}
        {rows?.length === 0 && (
          <p className="px-4 py-3 text-body-sm text-on-surface-variant">
            Aucun membre déclaré — le projet suit les permissions du workspace.
          </p>
        )}
        {rows?.map((row) => (
          <div
            key={row.id}
            className="flex items-center gap-3 px-4 py-3 border-b border-hairline last:border-b-0"
          >
            <Avatar name={row.user_name ?? `#${row.user_id}`} size={30} />
            <div className="flex-1 min-w-0">
              <p className="text-body-md font-medium text-on-surface truncate">
                {row.user_name ?? `#${row.user_id}`}
              </p>
              <p className="text-label-md text-outline">{PROJECT_ROLE_HINTS[row.role]}</p>
            </div>
            {isOwner ? (
              <select
                value={row.role}
                disabled={busy}
                onChange={(e) =>
                  run(
                    () => projectsApi.updateMember(projectId, row.user_id, e.target.value as ProjectRole),
                    "Rôle mis à jour."
                  )
                }
                className="h-8 rounded-lg border border-outline-soft bg-surface-container-lowest px-2 text-body-sm font-semibold text-on-surface outline-none focus:border-primary"
              >
                {PROJECT_ROLE_ORDER.map((r) => (
                  <option key={r} value={r}>
                    {PROJECT_ROLE_LABELS[r]}
                  </option>
                ))}
              </select>
            ) : (
              <span className="text-body-sm font-semibold text-on-surface">
                {PROJECT_ROLE_LABELS[row.role]}
              </span>
            )}
            {isOwner && (
              <button
                type="button"
                disabled={busy}
                onClick={() => setPendingRemoval(row)}
                aria-label={`Retirer ${row.user_name ?? row.user_id}`}
                title="Retirer du projet"
                className="w-8 h-8 flex-none flex items-center justify-center rounded-lg text-on-surface-variant hover:bg-error-container hover:text-error disabled:opacity-40 transition-colors"
              >
                <PersonRemoveOutlined style={{ fontSize: 17 }} />
              </button>
            )}
          </div>
        ))}
      </div>

      {pendingRemoval && (
        <ConfirmDialog
          title={`Retirer ${pendingRemoval.user_name ?? `#${pendingRemoval.user_id}`} ?`}
          message="Cette personne perdra l'accès au projet. Ses tâches et son travail restent en place."
          confirmLabel="Retirer"
          busy={busy}
          onConfirm={async () => {
            const target = pendingRemoval;
            setPendingRemoval(null);
            await run(() => projectsApi.removeMember(projectId, target.user_id), "Membre retiré.");
          }}
          onCancel={() => setPendingRemoval(null)}
        />
      )}

      {toast && <Toast message={toast} onDismiss={() => setToast(null)} />}
    </div>
  );
}
