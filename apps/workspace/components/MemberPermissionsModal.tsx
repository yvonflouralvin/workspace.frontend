"use client";

import { useState } from "react";
import { Modal } from "@repo/ui/Modal";
import { MultiSelect } from "@repo/ui/MultiSelect";
import { PermissionPicker } from "@repo/ui/PermissionPicker";
import { setMemberGroups, setMemberPermissions, ApiError } from "@/app/lib/api";
import type { Group, Member, AppPermissionGroup } from "@/app/lib/types";

export function MemberPermissionsModal({
  workspaceId,
  member,
  groups,
  permissionCatalog,
  onClose,
  onUpdated,
}: {
  workspaceId: number;
  member: Member;
  groups: Group[];
  permissionCatalog: AppPermissionGroup[];
  onClose: () => void;
  onUpdated: (member: Member) => void;
}) {
  const [groupIds, setGroupIds] = useState<number[]>(member.groups.map((g) => g.id));
  const [permissionIds, setPermissionIds] = useState<number[]>(
    member.direct_permissions.map((p) => p.id)
  );
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function togglePermission(id: number) {
    setPermissionIds((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
    );
  }

  async function handleSave() {
    setError(null);
    setSubmitting(true);
    try {
      await setMemberGroups(workspaceId, member.id, groupIds);
      const updated = await setMemberPermissions(workspaceId, member.id, permissionIds);
      onUpdated(updated);
      onClose();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Une erreur est survenue");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal title={`Gérer ${member.user.username}`} onClose={onClose} width="max-w-[32rem]">
      <div className="space-y-5">
        {error && (
          <p className="text-sm text-error bg-error-container/40 rounded-lg px-3 py-2">
            {error}
          </p>
        )}

        <div className="space-y-1">
          <p className="text-sm font-medium text-on-surface">Groupes</p>
          {groups.length === 0 ? (
            <p className="text-sm text-on-surface-variant px-1">Aucun groupe créé.</p>
          ) : (
            <MultiSelect
              options={groups.map((group) => ({ id: group.id, label: group.name }))}
              selectedIds={groupIds}
              onChange={(ids) => setGroupIds(ids as number[])}
              placeholder="Rechercher un groupe…"
              emptyLabel="Aucun groupe trouvé."
            />
          )}
        </div>

        <div className="space-y-1">
          <p className="text-sm font-medium text-on-surface">Permissions directes</p>
          <PermissionPicker
            groups={permissionCatalog}
            selectedIds={permissionIds}
            onToggle={togglePermission}
          />
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-sm font-medium text-on-surface-variant hover:bg-surface-container transition-colors"
          >
            Annuler
          </button>
          <button
            onClick={handleSave}
            disabled={submitting}
            className="px-4 py-2 rounded-xl text-sm font-medium bg-primary text-on-primary disabled:opacity-50"
          >
            {submitting ? "Enregistrement…" : "Enregistrer"}
          </button>
        </div>
      </div>
    </Modal>
  );
}
