"use client";

import { useCallback, useEffect, useState } from "react";
import { JournalHistorique } from "@/components/JournalHistorique";
import { listHistorique, type EvenementTache } from "@/lib/bfm-suivi-api";
import { useTache } from "../tache-context";

export default function HistoriqueTachePage() {
  const { tache } = useTache();
  const [lignes, setLignes] = useState<EvenementTache[] | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);

  const charger = useCallback(async () => {
    try {
      setLignes(await listHistorique(tache.id));
      setErreur(null);
    } catch (err) {
      setErreur(err instanceof Error ? err.message : "Impossible de charger l'historique.");
    }
  }, [tache.id]);

  useEffect(() => {
    void charger();
  }, [charger]);

  return (
    <div className="max-w-[800px] space-y-3">
      <div className="flex items-center gap-3">
        <p className="flex-1 text-body-sm text-on-surface-variant">
          Qui a fait quoi sur cette tâche : changements de statut, assignations, constats, validations et documents.
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
          Aucune activité enregistrée. L&apos;historique commence avec la première modification de cette tâche.
        </p>
      ) : (
        <JournalHistorique lignes={lignes} />
      )}
    </div>
  );
}
