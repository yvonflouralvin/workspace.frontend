"use client";

import { useState } from "react";
import { Modal } from "@repo/ui/Modal";
import { Checkbox } from "@repo/ui/Checkbox";
import { createMember, ApiError } from "@/app/lib/api";
import type { Group, Member } from "@/app/lib/types";

export function AddMemberModal({
  workspaceId,
  groups,
  onClose,
  onCreated,
}: {
  workspaceId: number;
  groups: Group[];
  onClose: () => void;
  onCreated: (member: Member) => void;
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [groupIds, setGroupIds] = useState<number[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function toggleGroup(id: number) {
    setGroupIds((prev) =>
      prev.includes(id) ? prev.filter((g) => g !== id) : [...prev, id]
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const member = await createMember(workspaceId, {
        email,
        password: password || undefined,
        full_name: fullName || undefined,
        group_ids: groupIds,
      });
      onCreated(member);
      onClose();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Une erreur est survenue");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal title="Ajouter un membre" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <p className="text-sm text-error bg-error-container/40 rounded-lg px-3 py-2">
            {error}
          </p>
        )}

        <div className="space-y-1">
          <label className="text-sm font-medium text-on-surface">Email</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-3 py-2 rounded-xl border border-outline-variant bg-surface text-sm text-on-surface"
          />
        </div>

        <div className="space-y-1">
          <label className="text-sm font-medium text-on-surface">Nom complet</label>
          <input
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className="w-full px-3 py-2 rounded-xl border border-outline-variant bg-surface text-sm text-on-surface"
          />
        </div>

        <div className="space-y-1">
          <label className="text-sm font-medium text-on-surface">
            Mot de passe
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Laisser vide si le compte existe déjà"
            className="w-full px-3 py-2 rounded-xl border border-outline-variant bg-surface text-sm text-on-surface"
          />
        </div>

        {groups.length > 0 && (
          <div className="space-y-1">
            <p className="text-sm font-medium text-on-surface">Groupes</p>
            <div className="max-h-40 overflow-y-auto rounded-xl border border-outline-variant px-3">
              {groups.map((group) => (
                <Checkbox
                  key={group.id}
                  checked={groupIds.includes(group.id)}
                  onChange={() => toggleGroup(group.id)}
                  label={group.name}
                />
              ))}
            </div>
          </div>
        )}

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
            {submitting ? "Création…" : "Ajouter"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
