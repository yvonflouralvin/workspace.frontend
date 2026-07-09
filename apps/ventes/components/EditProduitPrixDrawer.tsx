"use client";

import { useState } from "react";
import { RightDrawer } from "@repo/ui/RightDrawer";
import { updateProduit, type ProduitDetail, type DeviseEntry } from "@/lib/ventes-api";

const inputCls =
  "w-full px-3 py-2 rounded-xl border border-outline-variant bg-surface-container-lowest text-body-md text-on-surface focus:outline-none focus:border-primary transition-colors";
const labelCls = "block text-label-md font-medium text-on-surface-variant mb-1.5";

function formatNum(n: number): string {
  return n.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function EditProduitPrixDrawer({
  produit,
  baseDevise,
  devises,
  onClose,
  onSaved,
}: {
  produit: ProduitDetail;
  baseDevise: string;
  devises: DeviseEntry[];
  onClose: () => void;
  onSaved: (produit: ProduitDetail) => void;
}) {
  const initial =
    produit.prix_vente === null || produit.prix_vente === undefined ? "" : String(produit.prix_vente);
  const [prix, setPrix] = useState(initial);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const prixNum = prix.trim() === "" ? null : Number(prix);
  const prixValide = prixNum !== null && !Number.isNaN(prixNum);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const updated = await updateProduit(produit.id, {
        prix_vente: prix.trim() === "" ? null : Number(prix),
      });
      onSaved(updated);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur lors de l'enregistrement.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <RightDrawer title="Modifier le prix de vente" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <p className="text-body-sm text-on-surface-variant">
          Le prix de vente est maintenu dans Ventes (produit « {produit.nom} »).
        </p>
        {error && (
          <p className="text-body-sm text-error bg-error-container/40 rounded-lg px-3 py-2">{error}</p>
        )}
        <div>
          <label className={labelCls}>Prix de vente{baseDevise ? ` (${baseDevise})` : ""}</label>
          <input
            className={inputCls}
            type="number"
            step="0.01"
            min="0"
            value={prix}
            onChange={(e) => setPrix(e.target.value)}
            autoFocus
          />
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-body-md font-medium text-on-surface-variant hover:bg-surface-container transition-colors"
          >
            Annuler
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="px-4 py-2 rounded-xl text-body-md font-medium bg-primary text-on-primary hover:bg-primary-container transition-colors disabled:opacity-50"
          >
            {submitting ? "Enregistrement…" : "Enregistrer"}
          </button>
        </div>

        {devises.length > 0 && (
          <div className="pt-3 border-t border-outline-variant space-y-2">
            <p className="text-label-md font-medium text-on-surface-variant">Conversions</p>
            <div className="rounded-xl border border-outline-variant divide-y divide-outline-variant overflow-hidden">
              {devises.map((d) => (
                <div key={d.code} className="flex items-center justify-between gap-4 px-3 py-2 text-body-sm">
                  <span className="text-on-surface-variant truncate">
                    {d.code}
                    {d.libelle ? <span className="text-on-surface-variant/70"> — {d.libelle}</span> : null}
                  </span>
                  <span className="text-on-surface tabular-nums shrink-0">
                    {prixValide ? `${formatNum(prixNum! * Number(d.taux))} ${d.code}` : "—"}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </form>
    </RightDrawer>
  );
}
