"use client";

import { useState } from "react";
import { AddOutlined, DeleteOutlineOutlined, PersonOutlined } from "@mui/icons-material";
import {
  createTache,
  updateTache,
  deleteTache,
  PRIORITE_LABELS,
  STATUT_TACHE_LABELS,
  type Tache,
} from "@/lib/bfm-missions-api";
import { ChampMembre } from "@/components/SelecteurMembre";
import { TacheDrawer } from "@/components/TacheDrawer";
import { useMission } from "../../../mission-context";
import { FIELD } from "../../../ui";
import { usePhase } from "../phase-context";

export default function TachesPhasePage() {
  const { missionId, mission, membres, reload } = useMission();
  const { phase, taches } = usePhase();
  const [error, setError] = useState<string | null>(null);
  // drawer : Tache = aperçu, null = création, false = fermé.
  const [drawer, setDrawer] = useState<Tache | null | false>(false);
  const [ajout, setAjout] = useState(false);
  const [titre, setTitre] = useState("");

  async function run(fn: () => Promise<unknown>) {
    setError(null);
    try {
      await fn();
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Une erreur est survenue.");
    }
  }

  const modifier = (t: Tache, patch: Partial<Tache>) => run(() => updateTache(missionId, t.id, patch));

  return (
    <div className="space-y-3">
      {error && <p className="text-body-sm text-error bg-error-container/40 rounded-lg px-3 py-2">{error}</p>}

      <div className="rounded-2xl border border-outline-soft bg-surface-container-lowest overflow-hidden">
        <div className="hidden md:flex items-center gap-4 px-5 py-2.5 bg-surface-row-alt border-b border-surface-container-low text-label-sm uppercase text-outline">
          <span className="flex-1 min-w-0">Tâche</span>
          <span className="w-[190px] flex-none">Assigné à</span>
          <span className="w-[110px] flex-none">Priorité</span>
          <span className="w-[140px] flex-none">Échéance</span>
          <span className="w-[120px] flex-none">Statut</span>
          <span className="w-[40px] flex-none" />
        </div>

        {taches.length === 0 && (
          <p className="px-5 py-4 text-body-sm text-on-surface-variant">Aucune tâche dans cette phase.</p>
        )}

        {taches.map((t) => (
          <div
            key={t.id}
            className="flex flex-wrap md:flex-nowrap items-center gap-x-4 gap-y-2 px-4 md:px-5 py-2.5 border-b border-hairline last:border-b-0"
          >
            <button
              onClick={() => setDrawer(t)}
              className="w-full md:flex-1 min-w-0 flex items-center gap-2 text-left text-body-md text-on-surface hover:text-primary transition-colors"
            >
              <span className="truncate">{t.titre}</span>
              {t.assignee_client && (
                <span
                  className="flex-none inline-flex items-center gap-0.5 rounded-full bg-primary/10 px-1.5 py-px text-label-sm font-semibold text-primary"
                  title="Assignée au client"
                >
                  <PersonOutlined style={{ fontSize: 12 }} />
                  Client
                </span>
              )}
            </button>
            <span className="md:w-[190px] flex-none">
              <ChampMembre
                valeur={t.assignee_user_id}
                membres={membres}
                placeholder="Non assignée"
                onChange={(id) => modifier(t, { assignee_user_id: id })}
              />
            </span>
            <select
              className={`${FIELD} md:w-[110px] flex-none`}
              value={t.priorite}
              onChange={(e) => modifier(t, { priorite: e.target.value as Tache["priorite"] })}
            >
              {Object.entries(PRIORITE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
            <input
              type="date"
              className={`${FIELD} md:w-[140px] flex-none`}
              value={t.due_date ? t.due_date.slice(0, 10) : ""}
              onChange={(e) => modifier(t, { due_date: e.target.value || null })}
            />
            <select
              className={`${FIELD} md:w-[120px] flex-none`}
              value={t.statut}
              onChange={(e) => modifier(t, { statut: e.target.value as Tache["statut"] })}
            >
              {Object.entries(STATUT_TACHE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
            <span className="md:w-[40px] flex-none flex md:justify-end">
              <button
                onClick={() => run(() => deleteTache(missionId, t.id))}
                title="Supprimer"
                className="p-1.5 rounded-lg text-on-surface-variant hover:text-error hover:bg-error/8 transition-colors"
              >
                <DeleteOutlineOutlined style={{ fontSize: 16 }} />
              </button>
            </span>
          </div>
        ))}

        <div className="px-4 md:px-5 py-3 border-t border-hairline">
          {ajout ? (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void run(async () => {
                  await createTache(missionId, phase.id, { titre: titre.trim() });
                  setTitre("");
                  setAjout(false);
                });
              }}
              className="flex items-end gap-2"
            >
              <input
                className={`${FIELD} flex-1`}
                placeholder="Nouvelle tâche"
                value={titre}
                onChange={(e) => setTitre(e.target.value)}
                required
                autoFocus
              />
              <button type="button" onClick={() => setAjout(false)} className="h-9 px-3 rounded-lg text-body-sm text-on-surface-variant hover:bg-surface-container transition-colors">
                Annuler
              </button>
              <button type="submit" disabled={!titre.trim()} className="h-9 px-3 rounded-lg bg-primary text-on-primary text-body-sm font-semibold disabled:opacity-50">
                Ajouter
              </button>
            </form>
          ) : (
            <span className="inline-flex items-center gap-4">
              <button
                onClick={() => setAjout(true)}
                className="inline-flex items-center gap-1.5 text-body-sm font-semibold text-primary hover:underline"
              >
                <AddOutlined style={{ fontSize: 16 }} />
                Ajouter une tâche
              </button>
              <button
                onClick={() => setDrawer(null)}
                className="text-body-sm text-on-surface-variant hover:text-primary hover:underline transition-colors"
              >
                avec plus de détails
              </button>
            </span>
          )}
        </div>
      </div>

      {drawer !== false && (
        <TacheDrawer
          missionId={missionId}
          phaseId={phase.id}
          tache={drawer}
          membres={membres}
          clientDisponible={mission.tiers_id !== null}
          onClose={() => setDrawer(false)}
          onSaved={reload}
        />
      )}
    </div>
  );
}
