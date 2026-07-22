"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { PersonAddOutlined, TuneOutlined } from "@mui/icons-material";
import { useSessionStore } from "@repo/auth/store/session.store";
import { usePermissions } from "@repo/auth/hooks/usePermissions";
import { ConfirmDialog } from "@repo/ui/ConfirmDialog";
import { SearchField } from "@repo/ui/SearchField";
import { Toast } from "@repo/ui/Toast";
import { listMembers, listGroups, listPermissions, removeMember, ApiError } from "@/app/lib/api";
import type { AppPermissionGroup, Group, Member } from "@/app/lib/types";
import { AddMemberModal } from "@/components/AddMemberModal";
import { MemberDetailDrawer } from "@/components/MemberDetailDrawer";
import { MembersTable } from "@/components/members/MembersTable";

const PAGE_SIZE = 20;

export default function MembersPage() {
  return (
    <Suspense fallback={<div className="p-4 md:p-8 text-body-md text-on-surface-variant">Chargement…</div>}>
      <MembersInner />
    </Suspense>
  );
}

function MembersInner() {
  const activeWorkspace = useSessionStore((s) => s.activeWorkspace);
  const user = useSessionStore((s) => s.user);
  const { can } = usePermissions();

  const [members, setMembers] = useState<Member[]>([]);
  const [total, setTotal] = useState(0);
  const [groups, setGroups] = useState<Group[]>([]);
  const [permissionCatalog, setPermissionCatalog] = useState<AppPermissionGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [pendingRemoval, setPendingRemoval] = useState<Member | null>(null);
  const [removing, setRemoving] = useState(false);
  const [toast, setToast] = useState<{ message: string; tone: "success" | "error" } | null>(null);

  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [page, setPage] = useState(0);
  const [refetchToken, setRefetchToken] = useState(0);

  const workspaceId = activeWorkspace?.id;
  const canView = can("members.view");
  const searchParams = useSearchParams();

  useEffect(() => {
    if (searchParams.get("add") === "1" && can("members.invite")) setShowAddModal(true);
  }, [searchParams, can]);

  useEffect(() => {
    const timeout = setTimeout(() => setDebouncedQuery(query), 300);
    return () => clearTimeout(timeout);
  }, [query]);

  useEffect(() => {
    if (!workspaceId || !canView) return;
    listGroups(workspaceId).then((res) => setGroups(res.groups)).catch(() => {});
    listPermissions().then((res) => setPermissionCatalog(res.groups)).catch(() => {});
  }, [workspaceId, canView, refetchToken]);

  useEffect(() => {
    if (!workspaceId || !canView) {
      setLoading(false);
      return;
    }
    setLoading(true);
    listMembers(workspaceId, { search: debouncedQuery, limit: PAGE_SIZE, offset: page * PAGE_SIZE })
      .then((res) => {
        setMembers(res.members);
        setTotal(res.total);
        setError(null);
      })
      .catch((err) => setError(err instanceof ApiError ? err.message : "Une erreur est survenue"))
      .finally(() => setLoading(false));
  }, [workspaceId, canView, debouncedQuery, page, refetchToken]);

  const confirmRemoval = useCallback(async () => {
    if (!workspaceId || !pendingRemoval) return;
    setRemoving(true);
    try {
      await removeMember(workspaceId, pendingRemoval.id);
      setToast({ message: `${pendingRemoval.user.username} a été retiré du workspace.`, tone: "success" });
      setPendingRemoval(null);
      setSelectedMember(null);
      setRefetchToken((t) => t + 1);
    } catch (err) {
      setToast({
        message: err instanceof ApiError ? err.message : "Une erreur est survenue",
        tone: "error",
      });
    } finally {
      setRemoving(false);
    }
  }, [workspaceId, pendingRemoval]);

  if (!canView) {
    return (
      <div className="p-4 md:p-8 max-w-[1024px] mx-auto">
        <h1 className="font-display text-headline-md text-on-surface">Membres</h1>
        <p className="text-body-md text-on-surface-variant mt-0.5">
          Vous n&apos;avez pas accès à cette page.
        </p>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 max-w-[1024px] mx-auto">
      <div className="flex items-start gap-4 mb-6">
        <div className="hidden md:block flex-1">
          <h1 className="font-display text-headline-md text-on-surface">Membres</h1>
          <p className="text-body-md text-on-surface-variant mt-0.5">
            {total} membre{total > 1 ? "s" : ""}
          </p>
        </div>
        <div className="flex flex-1 md:flex-none gap-2.5">
          {can("groups.manage") && (
            <Link
              href="/members/groups"
              className="inline-flex flex-1 md:flex-none justify-center items-center gap-1.5 h-11 md:h-[38px] px-3.5 rounded-lg border border-outline-soft bg-surface-container-lowest text-body-sm font-semibold text-on-surface-variant hover:bg-surface-container-low transition-colors whitespace-nowrap"
            >
              <TuneOutlined style={{ fontSize: 16 }} />
              Gérer les groupes
            </Link>
          )}
          {can("members.invite") && (
            <button
              onClick={() => setShowAddModal(true)}
              className="inline-flex flex-1 md:flex-none justify-center items-center gap-1.5 h-11 md:h-[38px] px-4 rounded-lg bg-primary text-on-primary text-body-sm font-semibold shadow-button hover:bg-primary-container transition-colors whitespace-nowrap"
            >
              <PersonAddOutlined style={{ fontSize: 16 }} />
              Ajouter un membre
            </button>
          )}
        </div>
      </div>

      <SearchField
        value={query}
        onChange={(v) => {
          setQuery(v);
          setPage(0);
        }}
        placeholder="Rechercher un membre…"
        className="w-[300px] mb-4"
      />

      {error && (
        <p className="text-body-sm text-error bg-error-container/40 rounded-lg px-3 py-2 mb-4">
          {error}
        </p>
      )}

      <MembersTable
        members={members}
        total={total}
        page={page}
        pageSize={PAGE_SIZE}
        loading={loading}
        currentUserId={user?.id}
        onOpen={setSelectedMember}
        onPageChange={setPage}
      />

      {showAddModal && workspaceId && (
        <AddMemberModal
          workspaceId={workspaceId}
          groups={groups}
          onClose={() => setShowAddModal(false)}
          onCreated={(member) => {
            setToast({ message: `${member.user.username} a rejoint le workspace.`, tone: "success" });
            setRefetchToken((t) => t + 1);
          }}
        />
      )}

      {selectedMember && workspaceId && (
        <MemberDetailDrawer
          member={selectedMember}
          workspaceId={workspaceId}
          groups={groups}
          permissionCatalog={permissionCatalog}
          canManage={can("members.manage")}
          canRemove={can("members.remove")}
          onClose={() => setSelectedMember(null)}
          onUpdated={(updated) => {
            setSelectedMember(updated);
            setToast({ message: "Permissions mises à jour.", tone: "success" });
            setRefetchToken((t) => t + 1);
          }}
          onRemove={() => setPendingRemoval(selectedMember)}
        />
      )}

      {pendingRemoval && (
        <ConfirmDialog
          title={`Retirer ${pendingRemoval.user.username} ?`}
          message="Cette personne perdra l'accès au workspace et à toutes ses applications. Son compte n'est pas supprimé."
          confirmLabel="Retirer"
          busy={removing}
          onConfirm={confirmRemoval}
          onCancel={() => setPendingRemoval(null)}
        />
      )}

      {toast && (
        <Toast message={toast.message} tone={toast.tone} onDismiss={() => setToast(null)} />
      )}
    </div>
  );
}
