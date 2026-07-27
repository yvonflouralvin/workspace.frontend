"use client";

import { toneFor, type Etat, type Task } from "@/app/lib/projects-api";
import { TaskRow } from "./TaskRow";

export function TaskListView({
  tasks,
  etats,
  onOpen,
}: {
  tasks: Task[];
  /** Groupes de la liste : les états du jeu du projet, dans leur ordre. */
  etats: Etat[];
  onOpen: (t: Task) => void;
}) {
  const roots = tasks.filter((t) => !t.parent_task_id);

  return (
    <div className="space-y-5">
      {etats.map((etat) => {
        const rows = roots.filter((t) => t.etat_id === etat.id);
        if (rows.length === 0) return null;
        const tone = toneFor(etat.categorie_canonique);
        return (
          <div key={etat.id}>
            <h3 className="flex items-center gap-2 text-label-sm uppercase text-outline mb-2">
              <span className={`w-2 h-2 rounded-full ${tone?.dot ?? ""}`} />
              {etat.libelle}
              <span className="text-outline-variant">·</span>
              {rows.length}
            </h3>
            <div className="rounded-2xl border border-outline-soft bg-surface-container-lowest overflow-hidden">
              {rows.map((t, i) => (
                <TaskRow key={t.id} task={t} index={i} onOpen={onOpen} />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
