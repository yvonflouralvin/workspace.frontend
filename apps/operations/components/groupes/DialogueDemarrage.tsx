"use client";

import { useState } from "react";
import type { GroupeElectrogene } from "@/lib/operations-api";

const CHAMP =
  "h-9 w-full rounded-lg border border-outline-soft bg-surface-container-lowest px-3 text-body-sm text-on-surface outline-none focus:border-primary";

/** Consigner un démarrage.
 *
 *  L'heure est modifiable et préremplie à maintenant : on note souvent APRÈS
 *  coup — le courant tombe, on démarre, et l'on saisit quand on a une minute.
 *  Imposer « maintenant » ferait entrer des heures fausses, ce qui viderait le
 *  registre de son intérêt. */
export function DialogueDemarrage({
  groupe,
  enCours,
  onClose,
  onDemarrer,
}: {
  groupe: GroupeElectrogene;
  enCours?: boolean;
  onClose: () => void;
  onDemarrer: (corps: Record<string, unknown>) => void;
}) {
  const maintenant = new Date();
  maintenant.setMinutes(maintenant.getMinutes() - maintenant.getTimezoneOffset());
  const [quand, setQuand] = useState(maintenant.toISOString().slice(0, 16));
  const [motif, setMotif] = useState("");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-overlay p-4 animate-overlay-in">
      <div className="w-full max-w-[28rem] rounded-2xl bg-surface-container-lowest shadow-modal animate-pop-in">
        <div className="border-b border-outline-soft px-5 py-4">
          <h2 className="text-body-lg font-medium text-on-surface">Démarrer {groupe.nom}</h2>
        </div>
        <div className="flex flex-col gap-3 px-5 py-4">
          <label className="flex flex-col gap-1">
            <span className="text-label-md text-on-surface-variant">Démarré le</span>
            <input
              type="datetime-local"
              value={quand}
              onChange={(e) => setQuand(e.target.value)}
              className={CHAMP}
            />
            <span className="text-label-md text-outline">
              Modifiable : on consigne souvent après coup.
            </span>
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-label-md text-on-surface-variant">Raison (facultative)</span>
            <input
              value={motif}
              onChange={(e) => setMotif(e.target.value)}
              placeholder="Ex. : coupure SNEL, essai mensuel"
              className={CHAMP}
            />
          </label>
        </div>
        <div className="flex justify-end gap-2 border-t border-outline-soft px-5 py-3">
          <button
            type="button"
            onClick={onClose}
            className="h-9 rounded-lg px-4 text-body-sm font-medium text-on-surface-variant hover:bg-surface-container-low"
          >
            Annuler
          </button>
          <button
            type="button"
            disabled={enCours}
            onClick={() => onDemarrer({ debut: `${quand}:00`, motif: motif.trim() || null })}
            className="h-9 rounded-lg bg-primary px-4 text-body-sm font-semibold text-on-primary shadow-button disabled:opacity-50"
          >
            {enCours ? "…" : "Démarrer"}
          </button>
        </div>
      </div>
    </div>
  );
}
