"use client";

import { useState } from "react";
import { RightDrawer } from "@repo/ui/RightDrawer";
import type { DeviseEntry } from "@/lib/ventes-api";

const inputCls =
  "w-full px-3 py-2 rounded-xl border border-outline-variant bg-surface-container-lowest text-body-md text-on-surface focus:outline-none focus:border-primary transition-colors";
const labelCls = "block text-label-md font-medium text-on-surface-variant mb-1.5";

export function DeviseDrawer({
  entry,
  baseDevise,
  existingCodes,
  onClose,
  onSave,
}: {
  entry?: DeviseEntry | null;
  baseDevise: string;
  existingCodes: string[];
  onClose: () => void;
  onSave: (entry: DeviseEntry) => Promise<void>;
}) {
  const editing = !!entry;
  const [code, setCode] = useState(entry?.code ?? "");
  const [libelle, setLibelle] = useState(entry?.libelle ?? "");
  const [taux, setTaux] = useState(entry ? String(entry.taux) : "");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const c = code.trim().toUpperCase();
    if (!c) return;
    if (existingCodes.includes(c)) {
      setError("Cette devise existe déjà.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await onSave({
        code: c,
        libelle: libelle.trim() || null,
        taux: taux.trim() === "" ? 1 : Number(taux),
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur lors de l'enregistrement.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <RightDrawer title={editing ? "Modifier la devise" : "Ajouter une devise"} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <p className="text-body-sm text-on-surface-variant">
          Devise supplémentaire à faire figurer dans le total de la facturation, avec son taux
          d&apos;évaluation par rapport à la devise de base ({baseDevise || "—"}).
        </p>
        {error && (
          <p className="text-body-sm text-error bg-error-container/40 rounded-lg px-3 py-2">{error}</p>
        )}
        <div>
          <label className={labelCls}>Code devise *</label>
          <input
            className={inputCls}
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="USD, EUR…"
            autoFocus
            required
          />
        </div>
        <div>
          <label className={labelCls}>Libellé</label>
          <input
            className={inputCls}
            value={libelle}
            onChange={(e) => setLibelle(e.target.value)}
            placeholder="Dollar américain…"
          />
        </div>
        <div>
          <label className={labelCls}>Taux — 1 {baseDevise || "base"} = ? {code.trim().toUpperCase() || "devise"}</label>
          <input
            className={inputCls}
            type="number"
            step="0.000001"
            min="0"
            value={taux}
            onChange={(e) => setTaux(e.target.value)}
            placeholder="1"
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
            disabled={submitting || !code.trim()}
            className="px-4 py-2 rounded-xl text-body-md font-medium bg-primary text-on-primary hover:bg-primary-container transition-colors disabled:opacity-50"
          >
            {submitting ? "Enregistrement…" : editing ? "Enregistrer" : "Ajouter"}
          </button>
        </div>
      </form>
    </RightDrawer>
  );
}
