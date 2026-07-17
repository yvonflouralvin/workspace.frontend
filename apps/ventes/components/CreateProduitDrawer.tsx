"use client";

import { useEffect, useState } from "react";
import { RightDrawer } from "@repo/ui/RightDrawer";
import { createProduit, listCategories, type Produit, type Categorie } from "@/lib/ventes-api";
import { CategorieMultiSelect } from "./CategorieMultiSelect";

const inputCls =
  "w-full px-3 py-2 rounded-xl border border-outline-variant bg-surface-container-lowest text-body-md text-on-surface focus:outline-none focus:border-primary transition-colors";
const labelCls = "block text-label-md font-medium text-on-surface-variant mb-1.5";

export function CreateProduitDrawer({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (produit: Produit) => void;
}) {
  const [nom, setNom] = useState("");
  const [description, setDescription] = useState("");
  const [unite, setUnite] = useState("");
  const [categorieIds, setCategorieIds] = useState<number[]>([]);
  const [prix, setPrix] = useState("");
  const [cats, setCats] = useState<Categorie[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listCategories().then(setCats).catch(() => {});
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!nom.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      const produit = await createProduit({
        nom: nom.trim(),
        description: description.trim() || null,
        unite: unite.trim() || null,
        categorie_ids: categorieIds,
        prix_vente: prix.trim() === "" ? null : Number(prix),
      });
      onCreated(produit);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur lors de la création.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <RightDrawer title="Nouveau produit" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <p className="text-body-sm text-on-surface-variant">
          Crée un produit dans Ventes. Il pourra être publié dans Stock plus tard depuis sa fiche.
        </p>
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
          <label className={labelCls}>Catégories</label>
          <CategorieMultiSelect cats={cats} selected={categorieIds} onChange={setCategorieIds} />
        </div>
        <div>
          <label className={labelCls}>Unité</label>
          <input className={inputCls} placeholder="pcs" value={unite} onChange={(e) => setUnite(e.target.value)} />
        </div>
        <div>
          <label className={labelCls}>Prix de vente</label>
          <input
            className={inputCls}
            type="number"
            step="0.01"
            min="0"
            value={prix}
            onChange={(e) => setPrix(e.target.value)}
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
            disabled={submitting || !nom.trim()}
            className="px-4 py-2 rounded-xl text-body-md font-medium bg-primary text-on-primary hover:bg-primary-container transition-colors disabled:opacity-50"
          >
            {submitting ? "Création…" : "Créer le produit"}
          </button>
        </div>
      </form>
    </RightDrawer>
  );
}
