"use client";

import { useState } from "react";
import { Modal } from "@repo/ui/Modal";
import { createGroup, ApiError } from "@/app/lib/api";
import type { Group } from "@/app/lib/types";

export function CreateGroupModal({
  workspaceId,
  parent,
  onClose,
  onCreated,
}: {
  workspaceId: number;
  parent: Group | null;
  onClose: () => void;
  onCreated: (group: Group) => void;
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const group = await createGroup(workspaceId, {
        name,
        description: description || undefined,
        parent_id: parent?.id ?? null,
      });
      onCreated(group);
      onClose();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Une erreur est survenue");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal title={parent ? `Sous-groupe de ${parent.name}` : "Nouveau groupe"} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <p className="text-sm text-error bg-error-container/40 rounded-lg px-3 py-2">
            {error}
          </p>
        )}

        <div className="space-y-1">
          <label className="text-sm font-medium text-on-surface">Nom</label>
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-3 py-2 rounded-xl border border-outline-variant bg-surface text-sm text-on-surface"
          />
        </div>

        <div className="space-y-1">
          <label className="text-sm font-medium text-on-surface">Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            className="w-full px-3 py-2 rounded-xl border border-outline-variant bg-surface text-sm text-on-surface resize-none"
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
            {submitting ? "Création…" : "Créer"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
