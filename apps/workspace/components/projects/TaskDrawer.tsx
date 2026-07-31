"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import { AddOutlined, CheckOutlined, OpenInFullOutlined } from "@mui/icons-material";
import { RightDrawer } from "@repo/ui/RightDrawer";
import { SearchSelect } from "@repo/ui/SearchSelect";
import { SelecteurPersonne } from "./SelecteurPersonne";
import { TagInput } from "@repo/ui/TagInput";
import {
  PRIORITY_LABELS,
  PRIORITY_ORDER,
  projectsApi,
  toneFor,
  type Etat,
  type Phase,
  type Task,
} from "@/app/lib/projects-api";
import type { Member } from "@/app/(dashboard)/projects/[id]/project-context";

const FIELD =
  "w-full rounded-lg border border-outline-soft bg-surface-container-lowest text-body-md text-on-surface outline-none focus:border-primary transition-colors disabled:opacity-60";
const LABEL = "block text-label-sm uppercase text-outline mb-1.5";

export function TaskDrawer({
  task,
  projectId,
  phaseId,
  projectKey,
  subtasks,
  members,
  etats,
  phases,
  tagSuggestions = [],
  canManage,
  onClose,
  onSaved,
}: {
  task: Task | null;
  projectId: number;
  /** Création depuis une phase : l'élément y est rattaché d'emblée. */
  phaseId?: number;
  projectKey: string;
  subtasks: Task[];
  members: Member[];
  /** Jeu d'états du projet — le drawer n'en connaît aucun d'avance. */
  etats: Etat[];
  /** Phases entre lesquelles déplacer la tâche — absent quand le projet n'en
   *  expose qu'une (le champ disparaît alors du drawer). */
  phases?: Phase[];
  /** Étiquettes déjà utilisées dans le projet, proposées à la saisie. */
  tagSuggestions?: string[];
  canManage: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [title, setTitle] = useState(task?.title ?? "");
  const [description, setDescription] = useState(task?.description ?? "");
  const [etatId, setEtatId] = useState<number | null>(task?.etat_id ?? etats[0]?.id ?? null);
  const [priority, setPriority] = useState(task?.priority ?? "AUCUNE");
  const [assignee, setAssignee] = useState<string>(
    task?.assignee_user_id ? String(task.assignee_user_id) : ""
  );
  const [dueDate, setDueDate] = useState(task?.due_date ? task.due_date.slice(0, 10) : "");
  const [phase, setPhase] = useState<number | null>(task?.phase_id ?? phaseId ?? null);
  const [tags, setTags] = useState<string[]>(task?.tags ?? []);
  const [newSubtask, setNewSubtask] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const phaseOptions = phases ?? [];
  const currentPhaseName = phaseOptions.find((p) => p.id === (task?.phase_id ?? phaseId))?.name;
  // Liste locale : la recherche filtre les phases déjà chargées par le layout du projet.
  const fetchPhases = useCallback(
    async (query: string) =>
      phaseOptions.filter((p) => p.name.toLowerCase().includes(query.trim().toLowerCase())),
    [phaseOptions] // eslint-disable-line react-hooks/exhaustive-deps
  );

  const readOnly = !canManage;
  // Annuler ≠ supprimer : décision métier, l'élément reste visible.
  const annulable = etats.find((e) => e.categorie_canonique === "annule") ?? null;
  const etatCourant = etats.find((e) => e.id === etatId) ?? null;
  const tone = toneFor(etatCourant?.categorie_canonique);

  async function save() {
    setError(null);
    if (!title.trim()) {
      setError("Le titre est requis.");
      return;
    }
    setSaving(true);
    const body = {
      tags,
      title: title.trim(),
      description: description.trim() || null,
      ...(etatId ? { etat_id: etatId } : {}),
      priority,
      assignee_user_id: assignee ? Number(assignee) : null,
      due_date: dueDate ? new Date(dueDate).toISOString() : null,
    };
    try {
      if (task) {
        const moved = phase !== null && phase !== task.phase_id;
        await projectsApi.updateTask(task.id, moved ? { ...body, phase_id: phase } : body);
      } else {
        await projectsApi.createTask({ project_id: projectId, ...(phase ? { phase_id: phase } : {}), ...body });
      }
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
    // Bascule par CATÉGORIE : le premier état terminal du jeu, ou le premier
    // état d'entrée — aucun code n'est écrit en dur.
    const cible =
      subtask.categorie === "termine"
        ? etats.find((e) => e.categorie_canonique === "a_faire") ?? etats[0]
        : etats.find((e) => e.categorie_canonique === "termine");
    if (!cible) return;
    await projectsApi.updateTask(subtask.id, { etat_id: cible.id });
    onSaved();
  }

  async function addSubtask() {
    if (!task || !newSubtask.trim()) return;
    await projectsApi.createTask({
      project_id: projectId,
      phase_id: task.phase_id,
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
      width="md:w-[448px] md:max-w-[92vw]"
      footer={
        readOnly ? undefined : (
          <>
            {task && annulable && (
              <button
                onClick={() =>
                  projectsApi.updateTask(task.id, { etat_id: annulable.id }).then(onSaved)
                }
                disabled={saving}
                title="Décision métier : la tâche reste visible et compte comme abandon"
                className="h-[34px] px-3 rounded-lg text-label-md font-semibold text-on-surface-variant hover:bg-surface-container-low transition-colors"
              >
                Annuler
              </button>
            )}
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
        <div className="flex items-center justify-between gap-3 mb-3">
          <span
            className={`inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-[11px] font-semibold ${tone?.chip ?? ""}`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${tone?.dot ?? ""}`} />
            {etatCourant?.libelle ?? "—"}
          </span>
          <Link
            href={`/projects/${projectId}/tasks/${task.id}`}
            className="inline-flex items-center gap-1.5 text-label-md font-medium text-on-surface-variant hover:text-primary transition-colors"
          >
            <OpenInFullOutlined style={{ fontSize: 14 }} />
            Ouvrir la page
          </Link>
        </div>
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
            value={etatId ?? ""}
            onChange={(e) => setEtatId(Number(e.target.value))}
            disabled={readOnly}
          >
            {etats.map((etat) => (
              <option key={etat.id} value={etat.id}>
                {etat.libelle}
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
          <SelecteurPersonne
            valeur={{ userId: assignee ? Number(assignee) : null, groupeId: null }}
            membres={members}
            disabled={readOnly}
            onChange={(choix) => setAssignee(choix.userId ? String(choix.userId) : "")}
            placeholder="Rechercher un assigné…"
          />
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

      {phaseOptions.length > 1 && (
        <div className="mt-4">
          <p className={LABEL}>Phase</p>
          <SearchSelect<Phase>
            fetchOptions={fetchPhases}
            value={phase}
            initialLabel={currentPhaseName}
            onChange={(value) => setPhase(value === null ? null : Number(value))}
            getOptionLabel={(p) => p.name}
            placeholder="Rechercher une phase…"
            disabled={readOnly}
          />
          {task && subtasks.length > 0 && (
            <p className="mt-1.5 text-label-md text-outline">
              Les {subtasks.length} sous-tâche{subtasks.length > 1 ? "s" : ""} suivent la tâche
              dans sa nouvelle phase.
            </p>
          )}
        </div>
      )}

      <div className="mt-4">
        <p className={LABEL}>Étiquettes</p>
        <div className={`${FIELD} px-3 py-2`}>
          <TagInput value={tags} onChange={setTags} disabled={readOnly} suggestions={tagSuggestions} />
        </div>
      </div>

      {task && (
        <>
          <p className={`${LABEL} mt-5`}>
            Sous-tâches{" "}
            {subtasks.length > 0 && (
              <span className="normal-case tracking-normal text-outline">
                {subtasks.filter((s) => s.categorie === "termine").length}/{subtasks.length}
              </span>
            )}
          </p>
          <div className="rounded-xl border border-outline-soft overflow-hidden">
            {subtasks.length === 0 && (
              <p className="px-3 py-2.5 text-body-sm text-on-surface-variant">Aucune sous-tâche.</p>
            )}
            {subtasks.map((subtask) => {
              // Catégorie canonique : « fini » est un sens, pas un code.
              const done = subtask.categorie === "termine";
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
