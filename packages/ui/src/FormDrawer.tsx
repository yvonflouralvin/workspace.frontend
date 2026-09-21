"use client";

import { useId, useState } from "react";
import { RightDrawer } from "./RightDrawer";

/** Un `RightDrawer` pour un formulaire d'ajout ou de modification.
 *
 *  Le bouton d'envoi vit dans le pied du panneau, hors du `<form>` : il y est rattaché par
 *  l'attribut `form`, et reste visible même quand le formulaire dépasse la hauteur.
 *  `onSubmit` est asynchrone ; son échec s'affiche sous les champs et rend la main, son succès
 *  est à la charge de l'appelant, qui ferme le tiroir.
 */
export function FormDrawer({
  title,
  submitLabel,
  onSubmit,
  onClose,
  children,
}: {
  title: string;
  submitLabel: string;
  onSubmit: () => Promise<void>;
  onClose: () => void;
  children: React.ReactNode;
}) {
  const formId = useId();
  const [busy, setBusy] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  async function envoyer(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErreur(null);
    try {
      await onSubmit();
    } catch (err) {
      setErreur(err instanceof Error ? err.message : "Une erreur est survenue.");
      setBusy(false);
    }
  }

  return (
    <RightDrawer
      title={title}
      onClose={onClose}
      footer={
        <div className="flex w-full items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="h-9 px-3 rounded-lg text-body-sm text-on-surface-variant hover:bg-surface-container transition-colors"
          >
            Annuler
          </button>
          <button
            type="submit"
            form={formId}
            disabled={busy}
            className="h-9 px-4 rounded-lg bg-primary text-on-primary text-body-sm font-semibold shadow-button hover:bg-primary-container disabled:opacity-50 transition-colors"
          >
            {busy ? "…" : submitLabel}
          </button>
        </div>
      }
    >
      <form id={formId} onSubmit={envoyer} className="space-y-4">
        {children}
        {erreur && <p className="text-body-sm text-error">{erreur}</p>}
      </form>
    </RightDrawer>
  );
}
