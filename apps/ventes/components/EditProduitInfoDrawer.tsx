"use client";

import { useState } from "react";
import { RightDrawer } from "@repo/ui/RightDrawer";
import { updateProduit, type Produit } from "@/lib/ventes-api";

const inputCls =
  "w-full px-3 py-2 rounded-xl border border-outline-variant bg-surface-container-lowest text-body-md text-on-surface focus:outline-none focus:border-primary transition-colors";
const labelCls = "block text-label-md font-medium text-on-surface-variant mb-1.5";

export function EditProduitInfoDrawer({
  produit,
  onClose,
  onSaved,
}: {
  produit: Produit;
  onClose: () => void;
  onSaved: (produit: Produit) => void;
}) {
  const [nom, setNom] = useState(produit.nom);
  const [description, setDescription] = useState(produit.description ?? "");
  const [unite, setUnite] = useState(produit.unite ?? "");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!nom.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      const updated = await updateProduit(produit.id, {
        nom: nom.trim(),
        description: description.trim() || null,
        unite: unite.trim() || null,
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
    <RightDrawer title="Modifier le produit" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <p className="text-body-sm text-error bg-error-container/40 rounded-lg px-3 py-2">{error}</p>
        )}
        <div>
          <label className={labelCls}>Nom *</label>
          <input className={inputCls} value={nom} onChange={(e) => setNom(e.target.value)} autoFocus required />
        </div>
        <div>
          <label className={labelCls}>Description</label>
          <textarea
            className={`${inputCls} min-h-20 resize-y`}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>
        <div>
          <label className={labelCls}>Unité</label>
          <input className={inputCls} placeholder="pcs" value={unite} onChange={(e) => setUnite(e.target.value)} />
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
            disabled={submitting || !nom.trim()}
            className="px-4 py-2 rounded-xl text-body-md font-medium bg-primary text-on-primary hover:bg-primary-container transition-colors disabled:opacity-50"
          >
            {submitting ? "Enregistrement…" : "Enregistrer"}
          </button>
        </div>
      </form>
    </RightDrawer>
  );
}
