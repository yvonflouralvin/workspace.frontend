"use client";

import { useCallback, useEffect, useState } from "react";
import { JournalHistorique, LienTache } from "@/components/JournalHistorique";
import { listHistoriqueMission, type EvenementMission } from "@/lib/bfm-suivi-api";
import { useMission } from "../mission-context";

/** Le journal de toute la mission : chaque tâche y a ses faits, chaque fait sa tâche. */
export default function HistoriqueMissionPage() {
  const { missionId } = useMission();
  const [lignes, setLignes] = useState<EvenementMission[] | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);

  const charger = useCallback(async () => {
    try {
      setLignes(await listHistoriqueMission(missionId));
      setErreur(null);
    } catch (err) {
      setErreur(err instanceof Error ? err.message : "Impossible de charger l'historique.");
    }
  }, [missionId]);

  useEffect(() => {
    void charger();
  }, [charger]);

  return (
    <div className="max-w-[900px] space-y-3">
      <div className="flex items-center gap-3">
        <p className="flex-1 text-body-sm text-on-surface-variant">
          Qui a fait quoi sur les tâches de cette mission, toutes phases confondues. Une tâche supprimée y reste, avec
          la personne qui l&apos;a supprimée.
        </p>
        <button
          onClick={() => void charger()}
          className="h-8 px-3 rounded-lg border border-outline-soft text-body-sm font-semibold text-on-surface-variant hover:bg-surface-container-low transition-colors"
        >
          Actualiser
        </button>
      </div>

      {erreur && <p className="text-body-sm text-error bg-error-container/40 rounded-lg px-3 py-2">{erreur}</p>}

      {lignes === null ? (
        <p className="text-body-sm text-on-surface-variant">Chargement…</p>
      ) : lignes.length === 0 ? (
        <p className="rounded-2xl border border-outline-soft bg-surface-container-lowest px-5 py-4 text-body-sm text-on-surface-variant">
          Aucune activité enregistrée. L&apos;historique commence avec la première modification d&apos;une tâche.
        </p>
      ) : (
        <JournalHistorique
          lignes={lignes}
          situer={(l) => (
            <LienTache
              href={l.tache_id && l.phase_id ? `/missions/${missionId}/phases/${l.phase_id}/taches/${l.tache_id}` : null}
              titre={l.tache_titre}
              supprimee={l.tache_id === null}
            />
          )}
        />
      )}
    </div>
  );
}
