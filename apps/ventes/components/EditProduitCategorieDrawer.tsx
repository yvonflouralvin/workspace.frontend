"use client";

import { useEffect, useState } from "react";
import { RightDrawer } from "@repo/ui/RightDrawer";
import { updateProduit, listCategories, type Produit, type Categorie } from "@/lib/ventes-api";

const inputCls =
  "w-full px-3 py-2 rounded-xl border border-outline-variant bg-surface-container-lowest text-body-md text-on-surface focus:outline-none focus:border-primary transition-colors";
const labelCls = "block text-label-md font-medium text-on-surface-variant mb-1.5";

export function EditProduitCategorieDrawer({
  produit,
  onClose,
  onSaved,
}: {
  produit: Produit;
  onClose: () => void;
  onSaved: (produit: Produit) => void;
}) {
  const [categorieId, setCategorieId] = useState<string>(
    produit.categorie_id != null ? String(produit.categorie_id) : "",
  );
  const [cats, setCats] = useState<Categorie[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listCategories().then(setCats).catch(() => {});
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const updated = await updateProduit(produit.id, {
        categorie_id: categorieId === "" ? null : Number(categorieId),
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
    <RightDrawer title="Catégorie du produit" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <p className="text-body-sm text-error bg-error-container/40 rounded-lg px-3 py-2">{error}</p>
        )}
        <div>
          <label className={labelCls}>Catégorie</label>
          <select
            className={inputCls}
            value={categorieId}
            onChange={(e) => setCategorieId(e.target.value)}
            autoFocus
          >
            <option value="">— Aucune —</option>
            {cats.map((c) => (
              <option key={c.id} value={c.id}>{c.nom}</option>
            ))}
          </select>
        </div>
        {cats.length === 0 && (
          <p className="text-body-sm text-on-surface-variant">
            Aucune catégorie définie. Créez-en depuis Produits › Catégories.
          </p>
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
