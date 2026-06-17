"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowBackOutlined, AddOutlined } from "@mui/icons-material";
import { useSessionStore } from "@repo/auth/store/session.store";
import { usePermissions } from "@repo/auth/hooks/usePermissions";
import { listGroups, listPermissions, ApiError } from "@/app/lib/api";
import type { Group, AppPermissionGroup } from "@/app/lib/types";
import { GroupTree } from "@/components/GroupTree";
import { GroupEditorPanel } from "@/components/GroupEditorPanel";
import { CreateGroupModal } from "@/components/CreateGroupModal";

export default function GroupsPage() {
  const activeWorkspace = useSessionStore((s) => s.activeWorkspace);
  const { can } = usePermissions();

  const [groups, setGroups] = useState<Group[]>([]);
  const [permissionCatalog, setPermissionCatalog] = useState<AppPermissionGroup[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [createParent, setCreateParent] = useState<Group | null | undefined>(undefined);

  const workspaceId = activeWorkspace?.id;
  const canManage = can("groups.manage");

  useEffect(() => {
    if (!workspaceId || !canManage) {
      setLoading(false);
      return;
    }

    Promise.all([listGroups(workspaceId), listPermissions()])
      .then(([groupsRes, permissionsRes]) => {
        setGroups(groupsRes.groups);
        setPermissionCatalog(permissionsRes.groups);
      })
      .catch((err) => {
        setError(err instanceof ApiError ? err.message : "Une erreur est survenue");
      })
      .finally(() => setLoading(false));
  }, [workspaceId, canManage]);

  if (!canManage) {
    return (
      <div className="p-8 max-w-5xl mx-auto">
        <h1 className="text-2xl font-bold text-on-surface">Groupes</h1>
        <p className="text-sm text-on-surface-variant mt-1">
          Vous n&apos;avez pas accès à cette page.
        </p>
      </div>
    );
  }

  const selectedGroup = groups.find((g) => g.id === selectedId) ?? null;
  const hasChildren = selectedGroup
    ? groups.some((g) => g.parent_id === selectedGroup.id)
    : false;

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-6">
      <div>
        <Link
          href="/members"
          className="inline-flex items-center gap-1.5 text-sm text-on-surface-variant hover:text-on-surface transition-colors"
        >
          <ArrowBackOutlined style={{ fontSize: 16 }} />
          Membres
        </Link>
        <div className="flex items-start justify-between mt-2">
          <div>
            <h1 className="text-2xl font-bold text-on-surface">Groupes</h1>
            <p className="text-sm text-on-surface-variant mt-1">
              Organisez les droits par groupe et sous-groupe.
            </p>
          </div>
          <button
            onClick={() => setCreateParent(null)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-on-primary text-sm font-medium"
          >
            <AddOutlined style={{ fontSize: 18 }} />
            Nouveau groupe
          </button>
        </div>
      </div>

      {error && (
        <p className="text-sm text-error bg-error-container/40 rounded-lg px-3 py-2">
          {error}
        </p>
      )}

      {loading ? (
        <p className="text-sm text-on-surface-variant">Chargement…</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="rounded-2xl border border-outline-variant bg-surface-container-lowest p-3">
            <GroupTree
              groups={groups}
              selectedId={selectedId}
              onSelect={(group) => setSelectedId(group.id)}
              onAddSubgroup={(parent) => setCreateParent(parent)}
            />
          </div>

          <div className="rounded-2xl border border-outline-variant bg-surface-container-lowest p-5">
            {selectedGroup ? (
              <GroupEditorPanel
                workspaceId={workspaceId!}
                group={selectedGroup}
                hasChildren={hasChildren}
                permissionCatalog={permissionCatalog}
                onUpdated={(updated) =>
                  setGroups((prev) =>
                    prev.map((g) => (g.id === updated.id ? updated : g))
                  )
                }
                onDeleted={(groupId) => {
                  setGroups((prev) => prev.filter((g) => g.id !== groupId));
                  setSelectedId(null);
                }}
              />
            ) : (
              <p className="text-sm text-on-surface-variant">
                Sélectionnez un groupe pour voir ses détails.
              </p>
            )}
          </div>
        </div>
      )}

      {createParent !== undefined && workspaceId && (
        <CreateGroupModal
          workspaceId={workspaceId}
          parent={createParent}
          onClose={() => setCreateParent(undefined)}
          onCreated={(group) => setGroups((prev) => [...prev, group])}
        />
      )}
    </div>
  );
}
