"use client";

import { useState } from "react";
import { RightDrawer } from "@repo/ui/RightDrawer";
import { createCategorie, updateCategorie, type Categorie } from "@/lib/ventes-api";

const inputCls =
  "w-full px-3 py-2 rounded-xl border border-outline-variant bg-surface-container-lowest text-body-md text-on-surface focus:outline-none focus:border-primary transition-colors";
const labelCls = "block text-label-md font-medium text-on-surface-variant mb-1.5";

export function CategorieDrawer({
  categorie,
  onClose,
  onSaved,
}: {
  categorie?: Categorie | null;
  onClose: () => void;
  onSaved: (categorie: Categorie) => void;
}) {
  const editing = !!categorie;
  const [nom, setNom] = useState(categorie?.nom ?? "");
  const [description, setDescription] = useState(categorie?.description ?? "");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!nom.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      const payload = { nom: nom.trim(), description: description.trim() || null };
      const saved = editing
        ? await updateCategorie(categorie!.id, payload)
        : await createCategorie(payload);
      onSaved(saved);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur lors de l'enregistrement.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <RightDrawer title={editing ? "Modifier la catégorie" : "Nouvelle catégorie"} onClose={onClose}>
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
            {submitting ? "Enregistrement…" : editing ? "Enregistrer" : "Créer"}
          </button>
        </div>
      </form>
    </RightDrawer>
  );
}
