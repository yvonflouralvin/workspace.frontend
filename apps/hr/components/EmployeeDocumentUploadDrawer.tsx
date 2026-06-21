"use client";

import { useState } from "react";
import { RightDrawer } from "@repo/ui/RightDrawer";
import { uploadEmployeeDocument, ApiError, type EmployeeDocument } from "@/app/lib/api";

export const DOCUMENT_CATEGORIES: { value: string; label: string }[] = [
  { value: "contract", label: "Contrat" },
  { value: "id_card", label: "Pièce d'identité" },
  { value: "diploma", label: "Diplôme" },
  { value: "other", label: "Autre" },
];

export function EmployeeDocumentUploadDrawer({
  employeeId,
  onClose,
  onUploaded,
}: {
  employeeId: number;
  onClose: () => void;
  onUploaded: (document: EmployeeDocument) => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [category, setCategory] = useState(DOCUMENT_CATEGORIES[0]!.value);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) {
      setError("Sélectionnez un fichier");
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      const document = await uploadEmployeeDocument(employeeId, file, category);
      onUploaded(document);
      onClose();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Une erreur est survenue");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <RightDrawer title="Ajouter un document" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <p className="text-sm text-error bg-error-container/40 rounded-lg px-3 py-2">
            {error}
          </p>
        )}

        <div className="space-y-1">
          <label className="text-sm font-medium text-on-surface">Catégorie</label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full px-3 py-2 rounded-xl border border-outline-variant bg-surface text-sm text-on-surface"
          >
            {DOCUMENT_CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1">
          <label className="text-sm font-medium text-on-surface">Fichier</label>
          <input
            type="file"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="w-full text-sm text-on-surface"
          />
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-sm font-medium text-on-surface-variant hover:bg-surface-container transition-colors"
          >
            Annuler
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="px-4 py-2 rounded-xl text-sm font-medium bg-primary text-on-primary disabled:opacity-50"
          >
            {submitting ? "Envoi…" : "Ajouter"}
          </button>
        </div>
      </form>
    </RightDrawer>
  );
}
