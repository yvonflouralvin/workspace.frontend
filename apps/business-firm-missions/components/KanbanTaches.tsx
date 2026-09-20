"use client";

import { useState } from "react";
import { PersonOutlined, ScheduleOutlined } from "@mui/icons-material";
import { Avatar } from "@repo/ui/Avatar";
import {
  PRIORITE_LABELS,
  STATUT_TACHE_LABELS,
  type StatutTache,
  type Tache,
} from "@/lib/bfm-missions-api";
import { dateCourte, enRetard } from "@/lib/format";
import { STATUT_TACHE_TONES } from "@/app/missions/[id]/ui";

const COLONNES: StatutTache[] = ["A_FAIRE", "EN_COURS", "TERMINEE"];

/** Les tâches en colonnes, une par statut. Glisser une carte change son statut.
 *
 *  Le glisser-déposer n'existe pas au toucher : chaque carte s'ouvre, et le statut s'y change
 *  aussi. Le kanban est une commodité, jamais la seule porte. */
export function KanbanTaches({
  taches,
  phaseDe,
  onOuvrir,
  onDeplacer,
}: {
  taches: Tache[];
  /** Le nom de la phase, à montrer sur la carte quand plusieurs phases se côtoient. */
  phaseDe?: (t: Tache) => string | null;
  onOuvrir: (t: Tache) => void;
  onDeplacer: (t: Tache, statut: StatutTache) => void;
}) {
  const [glisse, setGlisse] = useState<Tache | null>(null);
  const [survol, setSurvol] = useState<StatutTache | null>(null);

  return (
    <div className="flex gap-3 overflow-x-auto pb-2 snap-x snap-mandatory md:snap-none -mx-4 px-4 md:mx-0 md:px-0">
      {COLONNES.map((statut) => {
        const colonne = taches.filter((t) => t.statut === statut);
        const ton = STATUT_TACHE_TONES[statut];
        return (
          <div
            key={statut}
            onDragOver={(e) => {
              if (glisse) {
                e.preventDefault();
                setSurvol(statut);
              }
            }}
            onDragLeave={() => setSurvol((c) => (c === statut ? null : c))}
            onDrop={() => {
              if (glisse && glisse.statut !== statut) onDeplacer(glisse, statut);
              setGlisse(null);
              setSurvol(null);
            }}
            className={`w-[85vw] max-w-[320px] md:w-80 md:max-w-none shrink-0 snap-center md:snap-align-none rounded-2xl p-3 bg-surface-container/50 transition-colors ${
              survol === statut ? "ring-2 ring-primary/40" : ""
            }`}
          >
            <div className="flex items-center gap-2 px-1 pb-2.5">
              <span className={`w-2 h-2 rounded-full ${ton.dot}`} />
              <span className="flex-1 text-body-sm font-semibold text-on-surface-variant">
                {STATUT_TACHE_LABELS[statut]}
              </span>
              <span className="text-label-md text-outline tabular-nums">{colonne.length}</span>
            </div>

            <div className="space-y-2 min-h-[40px]">
              {colonne.length === 0 && (
                <p className="px-1 py-2 text-label-md text-outline">Aucune tâche.</p>
              )}
              {colonne.map((t) => {
                const retard = enRetard(t.due_date, t.statut === "TERMINEE");
                const phase = phaseDe?.(t);
                return (
                  <div
                    key={t.id}
                    draggable
                    onDragStart={() => setGlisse(t)}
                    onDragEnd={() => {
                      setGlisse(null);
                      setSurvol(null);
                    }}
                    onClick={() => onOuvrir(t)}
                    className="rounded-xl bg-surface-container-lowest border border-outline-soft shadow-card p-3 cursor-pointer hover:border-primary/40 transition-colors"
                  >
                    <p
                      className={`text-body-md font-medium ${
                        t.statut === "TERMINEE" ? "text-outline line-through" : "text-on-surface"
                      }`}
                    >
                      {t.titre}
                    </p>
                    {phase && <p className="mt-0.5 truncate text-label-md text-outline">{phase}</p>}

                    <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-label-md text-outline">
                      {t.assignee_client && (
                        <span
                          className="inline-flex items-center gap-0.5 rounded-full bg-primary/10 px-1.5 py-px text-label-sm font-semibold text-primary"
                          title="Assignée au client"
                        >
                          <PersonOutlined style={{ fontSize: 12 }} />
                          Client
                        </span>
                      )}
                      {t.priorite !== "AUCUNE" && <span>{PRIORITE_LABELS[t.priorite]}</span>}
                      {t.due_date && (
                        <span
                          className={`inline-flex items-center gap-0.5 ${retard ? "font-semibold text-error" : ""}`}
                        >
                          <ScheduleOutlined style={{ fontSize: 13 }} />
                          {dateCourte(t.due_date)}
                        </span>
                      )}
                      {t.assignee_nom && (
                        <span className="ml-auto" title={t.assignee_nom}>
                          <Avatar name={t.assignee_nom} size={20} />
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
