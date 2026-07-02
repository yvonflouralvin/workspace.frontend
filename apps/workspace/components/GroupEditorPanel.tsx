"use client";

import { useEffect, useState } from "react";
import { PermissionPicker } from "@repo/ui/PermissionPicker";
import { updateGroup, deleteGroup, setGroupPermissions, ApiError } from "@/app/lib/api";
import type { Group, AppPermissionGroup } from "@/app/lib/types";

export function GroupEditorPanel({
  workspaceId,
  group,
  hasChildren,
  permissionCatalog,
  onUpdated,
  onDeleted,
}: {
  workspaceId: number;
  group: Group;
  hasChildren: boolean;
  permissionCatalog: AppPermissionGroup[];
  onUpdated: (group: Group) => void;
  onDeleted: (groupId: number) => void;
}) {
  const [name, setName] = useState(group.name);
  const [description, setDescription] = useState(group.description ?? "");
  const [permissionIds, setPermissionIds] = useState<number[]>(
    group.permissions.map((p) => p.id)
  );
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setName(group.name);
    setDescription(group.description ?? "");
    setPermissionIds(group.permissions.map((p) => p.id));
  }, [group]);

  function togglePermission(id: number) {
    setPermissionIds((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
    );
  }

  async function handleSave() {
    setError(null);
    setSubmitting(true);
    try {
      if (!group.is_system) {
        await updateGroup(workspaceId, group.id, { name, description });
      }
      const updated = await setGroupPermissions(workspaceId, group.id, permissionIds);
      onUpdated(updated);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Une erreur est survenue");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete() {
    if (!confirm(`Supprimer le groupe "${group.name}" ?`)) return;
    setSubmitting(true);
    try {
      await deleteGroup(workspaceId, group.id);
      onDeleted(group.id);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Une erreur est survenue");
      setSubmitting(false);
    }
  }

  const isSystem = group.is_system;

  return (
    <div className="space-y-5">
      {error && (
        <p className="text-sm text-error bg-error-container/40 rounded-lg px-3 py-2">
          {error}
        </p>
      )}

      {isSystem && (
        <p className="text-sm text-on-surface-variant bg-surface-container rounded-lg px-3 py-2">
          Groupe système — le nom et la description ne sont pas modifiables.
        </p>
      )}

      <div className="space-y-1">
        <label className="text-sm font-medium text-on-surface">Nom</label>
        <input
          type="text"
          value={name}
          disabled={isSystem}
          onChange={(e) => setName(e.target.value)}
          className="w-full px-3 py-2 rounded-xl border border-outline-variant bg-surface text-sm text-on-surface disabled:opacity-60"
        />
      </div>

      <div className="space-y-1">
        <label className="text-sm font-medium text-on-surface">Description</label>
        <textarea
          value={description}
          disabled={isSystem}
          onChange={(e) => setDescription(e.target.value)}
          rows={2}
          className="w-full px-3 py-2 rounded-xl border border-outline-variant bg-surface text-sm text-on-surface resize-none disabled:opacity-60"
        />
      </div>

      <div className="space-y-1">
        <p className="text-sm font-medium text-on-surface">Permissions</p>
        <PermissionPicker
          groups={permissionCatalog}
          selectedIds={permissionIds}
          onToggle={togglePermission}
        />
      </div>

      <div className="flex justify-between gap-2 pt-2">
        {!isSystem && (
          <button
            onClick={handleDelete}
            disabled={submitting || hasChildren}
            title={hasChildren ? "Supprimez d'abord les sous-groupes" : undefined}
            className="px-4 py-2 rounded-xl text-sm font-medium text-error hover:bg-error-container/40 transition-colors disabled:opacity-40"
          >
            Supprimer
          </button>
        )}
        <button
          onClick={handleSave}
          disabled={submitting}
          className="px-4 py-2 rounded-xl text-sm font-medium bg-primary text-on-primary disabled:opacity-50 ml-auto"
        >
          {submitting ? "Enregistrement…" : "Enregistrer"}
        </button>
      </div>
    </div>
  );
}
