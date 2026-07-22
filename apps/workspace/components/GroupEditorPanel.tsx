"use client";

import { useEffect, useState } from "react";
import { LockOutlined } from "@mui/icons-material";
import { PermissionPicker } from "@repo/ui/PermissionPicker";
import { updateGroup, setGroupPermissions, ApiError } from "@/app/lib/api";
import type { Group, AppPermissionGroup } from "@/app/lib/types";

const LABEL = "block text-label-sm uppercase text-outline mb-1.5";
const FIELD =
  "w-full rounded-lg border border-outline-soft text-body-md text-on-surface outline-none focus:border-primary transition-colors disabled:bg-background disabled:text-on-surface-variant";

export function GroupEditorPanel({
  workspaceId,
  group,
  hasChildren,
  permissionCatalog,
  onUpdated,
  onRequestDelete,
  onError,
}: {
  workspaceId: number;
  group: Group;
  hasChildren: boolean;
  permissionCatalog: AppPermissionGroup[];
  onUpdated: (group: Group) => void;
  onRequestDelete: () => void;
  onError: (message: string) => void;
}) {
  const [name, setName] = useState(group.name);
  const [description, setDescription] = useState(group.description ?? "");
  const [permissionIds, setPermissionIds] = useState<number[]>(group.permissions.map((p) => p.id));
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setName(group.name);
    setDescription(group.description ?? "");
    setPermissionIds(group.permissions.map((p) => p.id));
  }, [group]);

  function togglePermission(id: number) {
    setPermissionIds((prev) => (prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]));
  }

  async function save() {
    setSaving(true);
    try {
      if (!group.is_system) {
        await updateGroup(workspaceId, group.id, { name, description });
      }
      onUpdated(await setGroupPermissions(workspaceId, group.id, permissionIds));
    } catch (err) {
      onError(err instanceof ApiError ? err.message : "Une erreur est survenue");
    } finally {
      setSaving(false);
    }
  }

  const locked = group.is_system;

  return (
    <div>
      {locked && (
        <div className="flex gap-2.5 px-3.5 py-3 rounded-[10px] bg-surface-container-low text-label-md text-on-surface-variant mb-4.5">
          <LockOutlined style={{ fontSize: 15 }} className="flex-none text-primary" />
          Groupe système — le nom et la description sont verrouillés.
        </div>
      )}

      <label className={LABEL} htmlFor="group-name">
        Nom
      </label>
      <input
        id="group-name"
        type="text"
        value={name}
        disabled={locked}
        onChange={(e) => setName(e.target.value)}
        className={`${FIELD} h-[38px] px-3`}
      />

      <label className={`${LABEL} mt-4`} htmlFor="group-description">
        Description
      </label>
      <textarea
        id="group-description"
        value={description}
        disabled={locked}
        onChange={(e) => setDescription(e.target.value)}
        className={`${FIELD} h-[60px] px-3 py-2.5 resize-none`}
      />

      <p className={`${LABEL} mt-4`}>Permissions</p>
      <PermissionPicker
        groups={permissionCatalog}
        selectedIds={permissionIds}
        onToggle={togglePermission}
      />

      <div className="flex justify-between mt-5">
        <button
          onClick={onRequestDelete}
          disabled={locked || hasChildren || saving}
          title={hasChildren ? "Supprimez d'abord les sous-groupes" : undefined}
          className="h-9 px-3.5 rounded-lg text-body-sm font-semibold text-error hover:bg-error-container disabled:opacity-40 disabled:hover:bg-transparent transition-colors"
        >
          Supprimer
        </button>
        <button
          onClick={save}
          disabled={saving}
          className="h-9 px-5 rounded-lg bg-primary text-on-primary text-body-sm font-semibold shadow-button hover:bg-primary-container disabled:opacity-50 transition-colors"
        >
          {saving ? "Enregistrement…" : "Enregistrer"}
        </button>
      </div>
    </div>
  );
}
