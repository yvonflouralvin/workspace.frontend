"use client";

import { useState } from "react";
import { AccountTreeOutlined, ChecklistOutlined, ScheduleOutlined } from "@mui/icons-material";
import { Avatar } from "@repo/ui/Avatar";
import { PriorityBars } from "@repo/ui/PriorityBars";
import {
  PRIORITY_LABELS,
  PRIORITY_LEVELS,
  toneFor,
  type Task,
} from "@/app/lib/projects-api";
import { isOverdue } from "./TaskRow";

/** Une colonne du tableau. Elle est DÉCRITE, pas déduite d'un état : le même
 *  tableau sert la vue d'un projet — colonnes = états — et la vue transverse du
 *  workspace — colonnes = catégories canoniques, seul vocabulaire commun à des
 *  projets dont les jeux d'états diffèrent. */
export interface ColonneKanban {
  /** Identifiant rendu à `onMove`. */
  cle: string | number;
  libelle: string;
  /** Catégorie canonique, pour la teinte. */
  categorie: string | null;
  /** Limite de travail simultané, quand la colonne en porte une. */
  limite?: number;
}

export function KanbanBoard({
  tasks,
  colonnes,
  appartient,
  canManage,
  onMove,
  onOpen,
  reference,
  sousTitre,
}: {
  tasks: Task[];
  colonnes: ColonneKanban[];
  /** À quelle colonne appartient une tâche. */
  appartient: (t: Task, cle: string | number) => boolean;
  canManage: boolean;
  onMove: (t: Task, cle: string | number) => void;
  onOpen: (t: Task) => void;
  /** Référence affichée sur la carte — « WEB-12 » dans un projet, rien ailleurs. */
  reference?: (t: Task) => string | null;
  /** Seconde ligne de la carte : la phase dans un projet, la provenance dans la
   *  vue transverse — c'est la première question devant une tâche venue d'ailleurs. */
  sousTitre?: (t: Task) => string | null;
}) {
  const [drag, setDrag] = useState<Task | null>(null);
  const [over, setOver] = useState<string | null>(null);

  // Les sous-tâches vivent dans leur carte parente, pas comme cartes autonomes.
  const roots = tasks.filter((t) => !t.parent_task_id);
  const childCount = (task: Task) => tasks.filter((t) => t.parent_task_id === task.id);

  return (
    <div className="flex gap-3 overflow-x-auto pb-2 snap-x snap-mandatory md:snap-none -mx-4 px-4 md:mx-0 md:px-0">
      {colonnes.map((colonne) => {
        const col = roots.filter((t) => appartient(t, colonne.cle));
        const tone = toneFor(colonne.categorie);
        const limite = colonne.limite;
        // COMPTE COMME LE BACKEND : tous les éléments de la colonne, sous-tâches
        // comprises — elles occupent la capacité de l'équipe même si elles
        // s'affichent dans leur carte parente. Compter les seules cartes
        // visibles ferait diverger l'affichage du refus.
        const effectif = tasks.filter((t) => appartient(t, colonne.cle)).length;
        const saturee = limite != null && effectif >= limite;
        return (
          <div
            key={colonne.cle}
            onDragOver={(e) => {
              if (drag) {
                e.preventDefault();
                setOver(String(colonne.cle));
              }
            }}
            onDragLeave={() => setOver((c) => (c === String(colonne.cle) ? null : c))}
            onDrop={() => {
              if (drag && !appartient(drag, colonne.cle)) onMove(drag, colonne.cle);
              setDrag(null);
              setOver(null);
            }}
            className={`w-[85vw] max-w-[300px] md:w-72 shrink-0 snap-center md:snap-align-none rounded-2xl p-3 transition-colors ${
              saturee ? "bg-error-container/25" : "bg-surface-container/50"
            } ${over === String(colonne.cle) ? "ring-2 ring-primary/40" : ""}`}
          >
            <div className="flex items-center gap-2 px-1 pb-2.5">
              <span className={`w-2 h-2 rounded-full ${tone?.dot ?? ""}`} />
              <span className="flex-1 text-body-sm font-semibold text-on-surface-variant">
                {colonne.libelle}
              </span>
              {limite != null ? (
                <span
                  title={`Limite de travail simultané : ${limite}`}
                  className={`rounded-full px-1.5 py-0.5 text-label-md font-semibold tabular-nums ${
                    saturee ? "bg-error-container text-on-error-container" : "text-outline"
                  }`}
                >
                  {effectif}/{limite}
                </span>
              ) : (
                <span className="text-label-md text-outline">{col.length}</span>
              )}
            </div>

            <div className="space-y-2 min-h-[40px]">
              {col.map((t) => {
                const children = childCount(t);
                // Catégorie canonique, jamais un code : « fini » est un sens.
                const doneChildren = children.filter((c) => c.categorie === "termine").length;
                const overdue = isOverdue(t);
                const seconde = sousTitre?.(t);
                const ref = reference?.(t);
                return (
                  <div
                    key={t.id}
                    draggable={canManage}
                    onDragStart={() => setDrag(t)}
                    onDragEnd={() => {
                      setDrag(null);
                      setOver(null);
                    }}
                    onClick={() => onOpen(t)}
                    className="rounded-xl bg-surface-container-lowest border border-outline-soft shadow-card p-3 cursor-pointer hover:border-primary/40 transition-colors"
                  >
                    <p className="text-body-md font-medium text-on-surface">{t.title}</p>

                    {seconde && (
                      <span
                        title={seconde}
                        className="flex items-center gap-1 mt-0.5 text-label-md text-outline"
                      >
                        <AccountTreeOutlined style={{ fontSize: 13 }} className="flex-none" />
                        <span className="truncate">{seconde}</span>
                      </span>
                    )}

                    {overdue && (
                      <span className="inline-flex items-center gap-1 mt-2 rounded-md bg-error-container px-1.5 py-0.5 text-[11px] font-semibold text-on-error-container">
                        <ScheduleOutlined style={{ fontSize: 12 }} />
                        En retard
                      </span>
                    )}

                    <div className="flex items-center gap-2 mt-2 text-label-md text-outline">
                      {ref && <span className="font-mono">{ref}</span>}
                      {t.priority !== "AUCUNE" && (
                        <PriorityBars
                          level={PRIORITY_LEVELS[t.priority] ?? 0}
                          label={PRIORITY_LABELS[t.priority]}
                        />
                      )}
                      {children.length > 0 && (
                        <span className="inline-flex items-center gap-1">
                          <ChecklistOutlined style={{ fontSize: 13 }} />
                          {doneChildren}/{children.length}
                        </span>
                      )}
                      {t.assignee_name && (
                        <span className="ml-auto">
                          <Avatar name={t.assignee_name} size={20} />
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
