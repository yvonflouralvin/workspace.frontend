"use client";

import { useState } from "react";
import { Modal } from "@repo/ui/Modal";
import { createGroup, ApiError } from "@/app/lib/api";
import type { Group } from "@/app/lib/types";

const FIELD =
  "w-full rounded-lg border border-outline-soft bg-surface-container-lowest text-body-md text-on-surface outline-none focus:border-primary transition-colors";
const LABEL = "block text-label-md font-semibold text-on-surface mb-1.5";

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

  async function submit(e?: React.FormEvent) {
    e?.preventDefault();
    setError(null);
    if (!name.trim()) {
      setError("Le nom est requis.");
      return;
    }
    setSubmitting(true);
    try {
      const group = await createGroup(workspaceId, {
        name: name.trim(),
        description: description.trim() || undefined,
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
    <Modal
      title={parent ? `Sous-groupe de ${parent.name}` : "Nouveau groupe"}
      onClose={onClose}
      width="max-w-[32rem]"
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="h-[38px] px-4 rounded-lg border border-outline-soft bg-surface-container-lowest text-body-sm font-semibold text-on-surface-variant hover:bg-surface-container-low transition-colors"
          >
            Annuler
          </button>
          <button
            type="button"
            onClick={() => submit()}
            disabled={submitting}
            className="ml-auto h-[38px] px-5 rounded-lg bg-primary text-on-primary text-body-sm font-semibold shadow-button hover:bg-primary-container disabled:opacity-50 transition-colors"
          >
            {submitting ? "Création…" : "Créer"}
          </button>
        </>
      }
    >
      <form onSubmit={submit} className="space-y-4">
        {error && (
          <p className="text-body-sm text-error bg-error-container/40 rounded-lg px-3 py-2">
            {error}
          </p>
        )}

        <div>
          <label className={LABEL}>Nom</label>
          <input
            type="text"
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ingénierie"
            className={`${FIELD} h-[38px] px-3`}
          />
        </div>

        <div>
          <label className={LABEL}>Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            className={`${FIELD} px-3 py-2.5 resize-none`}
          />
        </div>
      </form>
    </Modal>
  );
}
