"use client";

import { useState } from "react";
import { RightDrawer } from "@repo/ui/RightDrawer";
import { updateProduit, type ProduitDetail } from "@/lib/ventes-api";

const inputCls =
  "w-full px-3 py-2 rounded-xl border border-outline-variant bg-surface-container-lowest text-body-md text-on-surface focus:outline-none focus:border-primary transition-colors";
const labelCls = "block text-label-md font-medium text-on-surface-variant mb-1.5";

function formatNum(n: number): string {
  return n.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function EditProduitTvaDrawer({
  produit,
  tvaDefaut,
  baseDevise,
  onClose,
  onSaved,
}: {
  produit: ProduitDetail;
  tvaDefaut: number | string | null;
  baseDevise: string;
  onClose: () => void;
  onSaved: (produit: ProduitDetail) => void;
}) {
  const [applicable, setApplicable] = useState(produit.tva_applicable);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const prixNum =
    produit.prix_vente === null || produit.prix_vente === undefined || produit.prix_vente === ""
      ? null
      : Number(produit.prix_vente);
  const tvaTauxNum = tvaDefaut === null || tvaDefaut === "" ? null : Number(tvaDefaut);
  const montant =
    applicable && prixNum !== null && tvaTauxNum !== null ? (prixNum * tvaTauxNum) / 100 : null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const updated = await updateProduit(produit.id, { tva_applicable: applicable });
      onSaved(updated);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur lors de l'enregistrement.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <RightDrawer title="TVA applicable" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <p className="text-body-sm text-on-surface-variant">
          Détermine si la TVA s&apos;applique à ce produit. Le taux par défaut
          {tvaDefaut !== null && tvaDefaut !== "" ? ` (${tvaDefaut} %)` : ""} est défini dans
          Paramètres › TVA.
        </p>
        {error && (
          <p className="text-body-sm text-error bg-error-container/40 rounded-lg px-3 py-2">{error}</p>
        )}
        <div>
          <label className={labelCls}>TVA applicable</label>
          <select
            className={inputCls}
            value={applicable ? "oui" : "non"}
            onChange={(e) => setApplicable(e.target.value === "oui")}
            autoFocus
          >
            <option value="non">Non</option>
            <option value="oui">Oui</option>
          </select>
        </div>

        {applicable && (
          <div className="rounded-xl border border-outline-variant px-3 py-2 text-body-sm">
            <span className="text-on-surface-variant">Montant TVA sur le prix : </span>
            <span className="text-on-surface tabular-nums">
              {montant === null ? "—" : `${formatNum(montant)}${baseDevise ? ` ${baseDevise}` : ""}`}
            </span>
          </div>
        )}

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
      </form>
    </RightDrawer>
  );
}
