"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowBackOutlined, AddOutlined } from "@mui/icons-material";
import { useSessionStore } from "@repo/auth/store/session.store";
import { usePermissions } from "@repo/auth/hooks/usePermissions";
import { ConfirmDialog } from "@repo/ui/ConfirmDialog";
import { Toast } from "@repo/ui/Toast";
import { listGroups, listPermissions, deleteGroup, ApiError } from "@/app/lib/api";
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
  // `undefined` = modale fermée, `null` = création à la racine, sinon le parent.
  const [createParent, setCreateParent] = useState<Group | null | undefined>(undefined);
  const [pendingDeletion, setPendingDeletion] = useState<Group | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [toast, setToast] = useState<{ message: string; tone: "success" | "error" } | null>(null);

  const workspaceId = activeWorkspace?.id;
  const canManage = can("groups.manage");

  useEffect(() => {
    if (!workspaceId || !canManage) {
      setLoading(false);
      return;
    }
    listGroups(workspaceId)
      .then((res) => setGroups(res.groups))
      .catch((err) => setError(err instanceof ApiError ? err.message : "Une erreur est survenue"))
      .finally(() => setLoading(false));

    listPermissions()
      .then((res) => setPermissionCatalog(res.groups))
      .catch(() => {});
  }, [workspaceId, canManage]);

  const confirmDeletion = useCallback(async () => {
    if (!workspaceId || !pendingDeletion) return;
    setDeleting(true);
    try {
      await deleteGroup(workspaceId, pendingDeletion.id);
      setGroups((prev) => prev.filter((g) => g.id !== pendingDeletion.id));
      setSelectedId((id) => (id === pendingDeletion.id ? null : id));
      setToast({ message: `Groupe « ${pendingDeletion.name} » supprimé.`, tone: "success" });
      setPendingDeletion(null);
    } catch (err) {
      setToast({
        message: err instanceof ApiError ? err.message : "Une erreur est survenue",
        tone: "error",
      });
    } finally {
      setDeleting(false);
    }
  }, [workspaceId, pendingDeletion]);

  if (!canManage) {
    return (
      <div className="p-8 max-w-[1024px] mx-auto">
        <h1 className="font-display text-headline-md text-on-surface">Groupes</h1>
        <p className="text-body-md text-on-surface-variant mt-0.5">
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
    <div className="p-8 max-w-[1024px] mx-auto">
      <Link
        href="/members"
        className="inline-flex items-center gap-1.5 text-body-sm font-medium text-on-surface-variant hover:text-primary transition-colors mb-4"
      >
        <ArrowBackOutlined style={{ fontSize: 15 }} />
        Membres
      </Link>

      <div className="flex items-start gap-4 mb-6">
        <div className="flex-1">
          <h1 className="font-display text-headline-md text-on-surface">Groupes</h1>
          <p className="text-body-md text-on-surface-variant mt-0.5">
            Organisez les droits par groupe et sous-groupe.
          </p>
        </div>
        <button
          onClick={() => setCreateParent(null)}
          className="inline-flex items-center gap-1.5 h-[38px] px-4 rounded-lg bg-primary text-on-primary text-body-sm font-semibold shadow-button hover:bg-primary-container transition-colors"
        >
          <AddOutlined style={{ fontSize: 16 }} />
          Nouveau groupe
        </button>
      </div>

      {error && (
        <p className="text-body-sm text-error bg-error-container/40 rounded-lg px-3 py-2 mb-4">
          {error}
        </p>
      )}

      {loading ? (
        <p className="text-body-md text-on-surface-variant">Chargement…</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
          <GroupTree
            groups={groups}
            selectedId={selectedId}
            onSelect={(group) => setSelectedId(group.id)}
            onAddSubgroup={(parent) => setCreateParent(parent)}
          />

          <div className="rounded-2xl border border-outline-soft bg-surface-container-lowest p-5">
            {selectedGroup ? (
              <GroupEditorPanel
                workspaceId={workspaceId!}
                group={selectedGroup}
                hasChildren={hasChildren}
                permissionCatalog={permissionCatalog}
                onUpdated={(updated) => {
                  setGroups((prev) => prev.map((g) => (g.id === updated.id ? updated : g)));
                  setToast({ message: "Groupe enregistré.", tone: "success" });
                }}
                onRequestDelete={() => setPendingDeletion(selectedGroup)}
                onError={(message) => setToast({ message, tone: "error" })}
              />
            ) : (
              <p className="py-12 text-center text-body-md text-on-surface-variant">
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
          onCreated={(group) => {
            setGroups((prev) => [...prev, group]);
            setSelectedId(group.id);
            setToast({ message: `Groupe « ${group.name} » créé.`, tone: "success" });
          }}
        />
      )}

      {pendingDeletion && (
        <ConfirmDialog
          title={`Supprimer « ${pendingDeletion.name} » ?`}
          message="Les membres de ce groupe perdront les droits qu'il leur accordait. Les comptes ne sont pas supprimés."
          confirmLabel="Supprimer"
          busy={deleting}
          onConfirm={confirmDeletion}
          onCancel={() => setPendingDeletion(null)}
        />
      )}

      {toast && <Toast message={toast.message} tone={toast.tone} onDismiss={() => setToast(null)} />}
    </div>
  );
}
