"use client";

import { useState } from "react";
import { Modal } from "@repo/ui/Modal";
import { registerPaiement, type CommandeDetail, type LigneCommande } from "@/lib/ventes-api";
import { MODES_PAIEMENT, formatMontant, formatQuantite } from "@/lib/commande-ui";

function ligneTTC(l: LigneCommande, taux: number): number {
  const total = Number(l.total) || 0;
  return total + (l.tva_applicable ? (total * taux) / 100 : 0);
}

export function PaiementModal({
  commande,
  tvaTaux,
  deviseBase,
  onClose,
  onPaid,
}: {
  commande: CommandeDetail;
  tvaTaux: number;
  deviseBase: string;
  onClose: () => void;
  onPaid: (commande: CommandeDetail) => void;
}) {
  const unpaid = commande.lignes.filter((l) => !l.paye);
  const [step, setStep] = useState<1 | 2>(1);
  const [selected, setSelected] = useState<Set<number>>(new Set(unpaid.map((l) => l.id)));
  const [mode, setMode] = useState(MODES_PAIEMENT[0].value);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function toggle(id: number) {
    setSelected((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  }

  const montant = unpaid
    .filter((l) => selected.has(l.id))
    .reduce((s, l) => s + ligneTTC(l, tvaTaux), 0);

  async function submit() {
    setSubmitting(true);
    setError(null);
    try {
      const updated = await registerPaiement(commande.id, {
        ligne_ids: [...selected],
        mode_paiement: mode,
      });
      onPaid(updated);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur lors de l'enregistrement.");
      setSubmitting(false);
    }
  }

  return (
    <Modal title="Enregistrer un paiement" onClose={onClose} width="max-w-[36rem]">
      {step === 1 && (
        <div className="space-y-4">
          <p className="text-body-sm text-on-surface-variant">
            Sélectionnez les produits à encaisser dans ce paiement.
          </p>
          {unpaid.length === 0 ? (
            <p className="text-body-sm text-on-surface-variant bg-surface-container rounded-xl px-4 py-6 text-center">
              Tous les produits de cette commande sont déjà payés.
            </p>
          ) : (
            <div className="rounded-xl border border-outline-variant divide-y divide-outline-variant overflow-hidden">
              {unpaid.map((l) => (
                <label
                  key={l.id}
                  className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-surface-container-low transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={selected.has(l.id)}
                    onChange={() => toggle(l.id)}
                    className="w-4 h-4 accent-primary shrink-0"
                  />
                  <span className="flex-1 min-w-0 text-body-md text-on-surface truncate">
                    {l.produit_nom}
                    <span className="text-on-surface-variant"> × {formatQuantite(l.quantite)}</span>
                  </span>
                  <span className="text-body-sm text-on-surface tabular-nums shrink-0">
                    {formatMontant(ligneTTC(l, tvaTaux), deviseBase)}
                  </span>
                </label>
              ))}
            </div>
          )}

          <div className="flex items-center justify-between border-t border-outline-variant pt-3">
            <span className="text-body-md text-on-surface-variant">Total sélectionné</span>
            <span className="text-body-lg font-semibold text-on-surface tabular-nums">
              {formatMontant(montant, deviseBase)}
            </span>
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-body-md font-medium text-on-surface-variant hover:bg-surface-container transition-colors"
            >
              Annuler
            </button>
            <button
              type="button"
              onClick={() => setStep(2)}
              disabled={selected.size === 0}
              className="px-4 py-2 rounded-xl text-body-md font-medium bg-primary text-on-primary hover:bg-primary-container transition-colors disabled:opacity-50"
            >
              Suivant
            </button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-4">
          {error && (
            <p className="text-body-sm text-error bg-error-container/40 rounded-lg px-3 py-2">{error}</p>
          )}
          <div className="flex items-center justify-between rounded-xl bg-surface-container px-4 py-3">
            <span className="text-body-md text-on-surface-variant">Montant à payer</span>
            <span className="text-headline-sm font-display text-on-surface tabular-nums">
              {formatMontant(montant, deviseBase)}
            </span>
          </div>
          <div>
            <label className="block text-label-md font-medium text-on-surface-variant mb-1.5">
              Mode de paiement
            </label>
            <select
              value={mode}
              onChange={(e) => setMode(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-outline-variant bg-surface-container-lowest text-body-md text-on-surface focus:outline-none focus:border-primary transition-colors"
            >
              {MODES_PAIEMENT.map((m) => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </select>
          </div>
          <div className="flex items-center justify-between gap-2 pt-1">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="px-4 py-2 rounded-xl text-body-md font-medium text-on-surface-variant hover:bg-surface-container transition-colors"
            >
              ← Retour
            </button>
            <button
              type="button"
              onClick={submit}
              disabled={submitting}
              className="px-4 py-2 rounded-xl text-body-md font-medium bg-primary text-on-primary hover:bg-primary-container transition-colors disabled:opacity-50"
            >
              {submitting ? "Enregistrement…" : "Enregistrer le paiement"}
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}
