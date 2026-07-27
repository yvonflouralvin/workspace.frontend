"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { AddOutlined, ViewKanbanOutlined, ViewListOutlined } from "@mui/icons-material";
import { Toast } from "@repo/ui/Toast";
import { ViewModeSwitch } from "@repo/ui/ViewModeSwitch";
import {
  outilActif,
  paramsTableau,
  phasesVisible,
  projectsApi,
  type RefusWip,
  type Task,
} from "@/app/lib/projects-api";
import { useProject } from "@/app/(dashboard)/projects/[id]/project-context";
import { KanbanBoard } from "./KanbanBoard";
import { TaskListView } from "./TaskListView";
import { TaskDrawer } from "./TaskDrawer";
import { ForcageWipDialog } from "./ForcageWipDialog";

type ModeVue = "liste" | "kanban";

const MODES: { value: ModeVue; icon: React.ReactNode; label: string }[] = [
  { value: "liste", icon: <ViewListOutlined style={{ fontSize: 18 }} />, label: "Liste" },
  { value: "kanban", icon: <ViewKanbanOutlined style={{ fontSize: 18 }} />, label: "Kanban" },
];

export function TasksView({ phaseId }: { phaseId?: number }) {
  const { projectId, project, tasks: allTasks, setTasks, reloadTasks, phases, etats, members, canManage } = useProject();
  const phase = phaseId ? phases.find((p) => p.id === phaseId) ?? null : null;
  // L'outil Tableau OUVRE la vue en colonnes sur une phase et y applique ses
  // limites. Il ne l'impose pas : le tableau et la liste montrent le même
  // travail, et lire ne se décrète pas.
  const tableau = Boolean(phaseId) && outilActif(phase, "tableau");
  // Les limites s'appliquent PAR PHASE. La vue projet traverse les phases : elle
  // affiche donc les colonnes sans compteur, sinon deux limites distinctes se
  // mélangeraient dans une même colonne.
  const limites = tableau ? paramsTableau(phase).limites_wip : {};
  const [vue, setVue] = useState<ModeVue>(tableau ? "kanban" : "liste");
  // Sur une phase sans l'outil, le tableau n'existe pas : pas de sélecteur.
  const choixDeVue = tableau || !phaseId;
  const modeCourant: ModeVue = choixDeVue ? vue : "liste";
  // Vue de phase : on ne montre et ne crée que les éléments de cette phase.
  const tasks = phaseId ? allTasks.filter((t) => t.phase_id === phaseId) : allTasks;
  // Phases exposées à l'utilisateur : toutes dès que le projet en montre (même
  // règle que l'onglet Phases). La phase auto-créée en fait partie — elle porte de
  // vraies tâches, et rien n'empêche de la renommer. `phasesVisible` suffit à garder
  // le mot « phase » invisible dans un projet qui n'en a pas.
  // Mémoïsé : l'identité de la liste alimente le `fetchOptions` du SearchSelect.
  const visiblePhases = useMemo(() => (phasesVisible(phases) ? phases : []), [phases]);
  // Étiquettes déjà employées dans le projet — proposées à la saisie.
  const tagSuggestions = useMemo(
    () => [...new Set([...allTasks.flatMap((t) => t.tags ?? []), ...phases.flatMap((p) => p.tags ?? [])])].sort(),
    [allTasks, phases]
  );
  // Kanban global : chaque carte rappelle sa phase. Inutile dans la vue d'une phase.
  const phaseNames = useMemo(
    () =>
      phaseId ? undefined : Object.fromEntries(visiblePhases.map((p) => [p.id, p.name])),
    [phaseId, visiblePhases]
  );
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [editing, setEditing] = useState<Task | "new" | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  // Refus de WIP en attente d'arbitrage : {refus, tâche, état visé}.
  const [refus, setRefus] = useState<{ detail: RefusWip; task: Task } | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const t = searchParams.get("task");
    if (!t || !tasks.length) return;
    const found = tasks.find((x) => x.id === Number(t));
    if (found) setEditing(found);
  }, [searchParams, tasks]);

  async function moveTask(task: Task, etatId: number, motifForcage?: string) {
    const cible = etats.find((e) => e.id === etatId);
    setTasks((cur) =>
      cur.map((t) =>
        t.id === task.id
          ? { ...t, etat_id: etatId, etat_libelle: cible?.libelle ?? null, categorie: cible?.categorie_canonique ?? null }
          : t
      )
    );
    try {
      await projectsApi.updateTask(task.id, {
        etat_id: etatId,
        ...(motifForcage ? { motif_forcage: motifForcage } : {}),
      });
      setRefus(null);
    } catch (e) {
      // Le backend renvoie un détail structuré quand une colonne est saturée :
      // on propose l'arbitrage plutôt qu'un message d'erreur opaque.
      const detail = (e as { detail?: RefusWip })?.detail;
      if (detail && typeof detail === "object" && "forcage_possible" in detail) {
        setRefus({ detail, task });
      } else {
        setToast(e instanceof Error ? e.message : "Déplacement impossible.");
      }
    } finally {
      // Recharge dans tous les cas : le backend peut REFUSER (livrable dû non
      // approuvé, limite atteinte), l'optimisme local doit alors être annulé.
      reloadTasks();
    }
  }

  const current = editing === "new" ? null : editing;
  const subtasks = current ? tasks.filter((t) => t.parent_task_id === current.id) : [];

  return (
    <div className="space-y-4">
      {(choixDeVue || canManage) && (
        <div className="flex items-center justify-end gap-2">
          {choixDeVue && <ViewModeSwitch value={vue} options={MODES} onChange={setVue} />}
          {canManage && (
            <button
              onClick={() => setEditing("new")}
              className="inline-flex items-center justify-center gap-1.5 h-11 md:h-[38px] px-4 rounded-lg bg-primary text-on-primary text-body-sm font-semibold shadow-button hover:bg-primary-container transition-colors whitespace-nowrap"
            >
              <AddOutlined style={{ fontSize: 16 }} />
              Nouvelle tâche
            </button>
          )}
        </div>
      )}

      {modeCourant === "kanban" ? (
        <KanbanBoard
          tasks={tasks}
          etats={etats}
          limites={limites}
          canManage={canManage}
          onMove={moveTask}
          onOpen={setEditing}
          projectKey={project.key}
          phaseNames={phaseNames}
        />
      ) : (
        <TaskListView tasks={tasks} etats={etats} onOpen={setEditing} />
      )}

      {editing && (
        <TaskDrawer
          task={current}
          projectId={projectId}
          phaseId={phaseId}
          projectKey={project.key}
          subtasks={subtasks}
          members={members}
          etats={etats}
          phases={visiblePhases}
          tagSuggestions={tagSuggestions}
          canManage={canManage}
          onClose={() => {
            setEditing(null);
            if (searchParams.get("task")) router.replace(pathname);
          }}
          onSaved={() => {
            reloadTasks();
            setEditing(null);
            setToast("Tâche enregistrée.");
          }}
        />
      )}

      {refus && (
        <ForcageWipDialog
          refus={refus.detail}
          busy={busy}
          onConfirm={async (motif) => {
            setBusy(true);
            await moveTask(refus.task, refus.detail.etat_id, motif);
            setBusy(false);
          }}
          onCancel={() => setRefus(null)}
        />
      )}

      {toast && <Toast message={toast} onDismiss={() => setToast(null)} />}
    </div>
  );
}
