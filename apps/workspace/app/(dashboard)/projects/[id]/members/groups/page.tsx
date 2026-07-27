"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AddOutlined, DeleteOutlineOutlined } from "@mui/icons-material";
import { ConfirmDialog } from "@repo/ui/ConfirmDialog";
import { MultiSelect } from "@repo/ui/MultiSelect";
import { Toast } from "@repo/ui/Toast";
import {
  RULE_ACCESS_LABELS,
  RULE_ACCESS_ORDER,
  RULE_SCOPE_LABELS,
  RULE_SCOPE_ORDER,
  projectsApi,
  type GroupRule,
  type ProjectGroup,
  type ProjectMember,
  type RuleAccess,
  type RuleScope,
} from "@/app/lib/projects-api";
import { useProject } from "../../project-context";

const INPUT =
  "h-[34px] px-2 rounded-lg border border-outline-soft bg-surface-container-lowest text-body-sm text-on-surface outline-none focus:border-primary";

export default function ProjectGroupsPage() {
  const { projectId, phases, tasks, isOwner } = useProject();

  const [groups, setGroups] = useState<ProjectGroup[] | null>(null);
  const [members, setMembers] = useState<ProjectMember[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [newName, setNewName] = useState("");
  const [pendingRemoval, setPendingRemoval] = useState<ProjectGroup | null>(null);
  const [busy, setBusy] = useState(false);

  const reload = useCallback(
    () => projectsApi.listGroups(projectId).then(setGroups).catch(() => setGroups([])),
    [projectId]
  );
  useEffect(() => {
    void reload();
    projectsApi.listMembers(projectId).then(setMembers).catch(() => {});
  }, [reload, projectId]);

  // Étiquettes réellement posées : une règle sur un tag inexistant ne montre rien.
  const knownTags = useMemo(
    () => [...new Set([...phases.flatMap((p) => p.tags ?? []), ...tasks.flatMap((t) => t.tags ?? [])])].sort(),
    [phases, tasks]
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

  if (!isOwner) {
    return (
      <p className="text-body-sm text-on-surface-variant">
        Seul le propriétaire du projet peut consulter et modifier les groupes.
      </p>
    );
  }

  return (
    <div className="max-w-[820px] space-y-5">
      <div>
        <h2 className="font-display text-headline-sm text-on-surface">Groupes du projet</h2>
        <p className="mt-1 text-body-sm text-on-surface-variant">
          Un groupe <strong>restreint</strong> ce que ses membres voient : dès qu&apos;une personne
          appartient à un groupe, elle ne voit plus que les phases et les tâches portant les
          étiquettes de ses règles. Sans groupe, son rôle s&apos;applique au projet entier.
          Plusieurs groupes se cumulent — c&apos;est le niveau d&apos;accès le plus fort qui
          l&apos;emporte, et le rôle le plafonne toujours.
        </p>
      </div>

      {error && (
        <p className="text-body-sm text-error bg-error-container/40 rounded-lg px-3 py-2">{error}</p>
      )}

      <div className="flex gap-2">
        <input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="Nom du groupe (ex. Équipe chantier)"
          className={`${INPUT} flex-1`}
        />
        <button
          type="button"
          disabled={!newName.trim() || busy}
          onClick={() =>
            run(async () => {
              await projectsApi.createGroup(projectId, { name: newName.trim() });
              setNewName("");
            }, "Groupe créé.")
          }
          className="inline-flex items-center gap-1.5 h-[34px] px-4 rounded-lg bg-primary text-on-primary text-body-sm font-semibold shadow-button hover:bg-primary-container disabled:opacity-50 transition-colors whitespace-nowrap"
        >
          <AddOutlined style={{ fontSize: 16 }} />
          Nouveau groupe
        </button>
      </div>

      {groups === null && <p className="text-body-sm text-on-surface-variant">Chargement…</p>}
      {groups?.length === 0 && (
        <p className="text-body-sm text-on-surface-variant">
          Aucun groupe — tous les membres voient le projet entier, selon leur rôle.
        </p>
      )}

      {groups?.map((group) => (
        <GroupCard
          key={group.id}
          group={group}
          members={members}
          knownTags={knownTags}
          busy={busy}
          onSave={(body, message) => run(() => projectsApi.updateGroup(projectId, group.id, body), message)}
          onDelete={() => setPendingRemoval(group)}
        />
      ))}

      {pendingRemoval && (
        <ConfirmDialog
          title={`Supprimer le groupe « ${pendingRemoval.name} » ?`}
          message="Ses membres retrouvent la vue complète du projet, selon leur rôle."
          confirmLabel="Supprimer"
          busy={busy}
          onConfirm={async () => {
            const target = pendingRemoval;
            setPendingRemoval(null);
            await run(() => projectsApi.deleteGroup(projectId, target.id), "Groupe supprimé.");
          }}
          onCancel={() => setPendingRemoval(null)}
        />
      )}

      {toast && <Toast message={toast} onDismiss={() => setToast(null)} />}
    </div>
  );
}

function GroupCard({
  group,
  members,
  knownTags,
  busy,
  onSave,
  onDelete,
}: {
  group: ProjectGroup;
  members: ProjectMember[];
  knownTags: string[];
  busy: boolean;
  onSave: (body: { user_ids?: number[]; rules?: GroupRule[] }, message: string) => void;
  onDelete: () => void;
}) {
  const [draft, setDraft] = useState<GroupRule>({ scope: "phase", tag: "", access: "READ" });

  const options = members.map((m) => ({ id: m.user_id, label: m.user_name ?? `#${m.user_id}` }));

  return (
    <div className="rounded-2xl border border-outline-soft bg-surface-container-lowest overflow-hidden">
      <div className="flex items-center gap-3 px-4 py-3 border-b border-hairline">
        <span className="flex-1 min-w-0 text-body-md font-semibold text-on-surface truncate">
          {group.name}
        </span>
        <button
          type="button"
          onClick={onDelete}
          disabled={busy}
          aria-label={`Supprimer le groupe ${group.name}`}
          className="w-8 h-8 flex-none flex items-center justify-center rounded-lg text-on-surface-variant hover:bg-error-container hover:text-error disabled:opacity-40 transition-colors"
        >
          <DeleteOutlineOutlined style={{ fontSize: 17 }} />
        </button>
      </div>

      <div className="px-4 py-3 border-b border-hairline">
        <p className="text-label-sm uppercase text-outline mb-1.5">Membres du groupe</p>
        <MultiSelect
          options={options}
          selectedIds={group.user_ids}
          onChange={(ids) => onSave({ user_ids: ids.map(Number) }, "Membres du groupe mis à jour.")}
          placeholder="Choisir parmi les membres du projet…"
        />
        {group.user_ids.length === 0 && (
          <p className="mt-1.5 text-label-md text-outline">
            Groupe vide : il ne restreint personne pour l&apos;instant.
          </p>
        )}
      </div>

      <div className="px-4 py-3">
        <p className="text-label-sm uppercase text-outline mb-1.5">Règles</p>
        {group.rules.length === 0 && (
          <p className="text-label-md text-outline mb-2">
            Aucune règle : ses membres ne verraient rien du projet. Ajoutez au moins une étiquette.
          </p>
        )}
        <div className="space-y-1.5">
          {group.rules.map((rule, index) => (
            <div key={`${rule.scope}-${rule.tag}-${index}`} className="flex items-center gap-2">
              <span className="w-[70px] flex-none text-body-sm text-on-surface-variant">
                {RULE_SCOPE_LABELS[rule.scope]}
              </span>
              <span className="flex-1 min-w-0 truncate rounded-full bg-surface-container px-2 py-0.5 text-label-md font-medium text-on-surface-variant">
                {rule.tag}
                {!knownTags.includes(rule.tag) && (
                  <span className="ml-1.5 text-outline" title="Aucun objet ne porte cette étiquette">
                    · inutilisée
                  </span>
                )}
              </span>
              <span className="text-body-sm text-on-surface-variant">{RULE_ACCESS_LABELS[rule.access]}</span>
              <button
                type="button"
                disabled={busy}
                onClick={() =>
                  onSave({ rules: group.rules.filter((_, i) => i !== index) }, "Règle retirée.")
                }
                aria-label="Retirer la règle"
                className="w-7 h-7 flex-none flex items-center justify-center rounded-lg text-on-surface-variant hover:bg-error-container hover:text-error transition-colors"
              >
                <DeleteOutlineOutlined style={{ fontSize: 15 }} />
              </button>
            </div>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2 mt-3">
          <select
            value={draft.scope}
            onChange={(e) => setDraft({ ...draft, scope: e.target.value as RuleScope })}
            className={INPUT}
          >
            {RULE_SCOPE_ORDER.map((s) => (
              <option key={s} value={s}>
                {RULE_SCOPE_LABELS[s]}
              </option>
            ))}
          </select>
          <input
            value={draft.tag}
            list={`tags-known-${group.id}`}
            onChange={(e) => setDraft({ ...draft, tag: e.target.value })}
            placeholder="Étiquette"
            className={`${INPUT} flex-1 min-w-[10rem]`}
          />
          <datalist id={`tags-known-${group.id}`}>
            {knownTags.map((tag) => (
              <option key={tag} value={tag} />
            ))}
          </datalist>
          <select
            value={draft.access}
            onChange={(e) => setDraft({ ...draft, access: e.target.value as RuleAccess })}
            className={INPUT}
          >
            {RULE_ACCESS_ORDER.map((a) => (
              <option key={a} value={a}>
                {RULE_ACCESS_LABELS[a]}
              </option>
            ))}
          </select>
          <button
            type="button"
            disabled={!draft.tag.trim() || busy}
            onClick={() => {
              onSave({ rules: [...group.rules, { ...draft, tag: draft.tag.trim() }] }, "Règle ajoutée.");
              setDraft({ scope: "phase", tag: "", access: "READ" });
            }}
            className="inline-flex items-center gap-1.5 h-[34px] px-3 rounded-lg border border-outline-soft text-body-sm font-semibold text-on-surface hover:bg-surface-container-low disabled:opacity-50 transition-colors"
          >
            <AddOutlined style={{ fontSize: 15 }} />
            Ajouter
          </button>
        </div>
      </div>
    </div>
  );
}
