"use client";

import { useCallback, useState } from "react";
import { createPortal } from "react-dom";
import { ConfirmDialog } from "../ConfirmDialog";

export interface DemandeSuppression {
  title: string;
  message?: React.ReactNode;
  /** « Supprimer » par défaut ; « Retirer » pour ce qui se détache sans disparaître. */
  confirmLabel?: string;
  /** Ne s'exécute qu'après confirmation. Elle gère elle-même ses erreurs : le dialogue se ferme dans tous les cas. */
  action: () => Promise<unknown> | unknown;
}

/** Toute suppression passe par une confirmation : un clic sur une corbeille ne doit jamais détruire seul.
 *
 *  `confirmer(demande)` ouvre le dialogue ; `dialogue` est à rendre une fois dans le composant.
 *  Il est monté sur `document.body` : rendu dans un tiroir (`RightDrawer`), un `fixed` resterait
 *  prisonnier de la transformation du panneau et ne couvrirait pas l'écran.
 */
export function useConfirmSuppression() {
  const [demande, setDemande] = useState<DemandeSuppression | null>(null);
  const [busy, setBusy] = useState(false);

  const confirmer = useCallback((d: DemandeSuppression) => setDemande(d), []);

  async function valider() {
    if (!demande) return;
    setBusy(true);
    try {
      await demande.action();
    } finally {
      setBusy(false);
      setDemande(null);
    }
  }

  const dialogue = demande
    ? createPortal(
        <ConfirmDialog
          title={demande.title}
          message={demande.message}
          confirmLabel={demande.confirmLabel ?? "Supprimer"}
          busy={busy}
          onConfirm={valider}
          onCancel={() => setDemande(null)}
        />,
        document.body,
      )
    : null;

  return { confirmer, dialogue };
}
