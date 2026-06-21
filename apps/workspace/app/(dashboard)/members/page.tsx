"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { PersonAddOutlined, SettingsOutlined } from "@mui/icons-material";
import { useSessionStore } from "@repo/auth/store/session.store";
import { usePermissions } from "@repo/auth/hooks/usePermissions";
import { Badge } from "@repo/ui/Badge";
import { DataList, type DataListColumn } from "@repo/ui/DataList";
import {
  listMembers,
  listGroups,
  listPermissions,
  removeMember,
  ApiError,
} from "@/app/lib/api";
import type { Member, Group, AppPermissionGroup } from "@/app/lib/types";
import { AddMemberModal } from "@/components/AddMemberModal";
import { MemberPermissionsModal } from "@/components/MemberPermissionsModal";
import { MemberDetailDrawer } from "@/components/MemberDetailDrawer";

const PAGE_SIZE = 20;

const MEMBER_COLUMNS: DataListColumn<Member>[] = [
  {
    key: "member",
    header: "Membre",
    render: (member) => (
      <div className="flex items-center gap-3">
        <span className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold flex-shrink-0">
          {member.user.username[0]?.toUpperCase() ?? "?"}
        </span>
        <div>
          <p className="text-on-surface font-medium">
            {member.user.username}
            {member.is_owner && (
              <span className="ml-2 text-xs text-on-surface-variant">(owner)</span>
            )}
          </p>
          <p className="text-on-surface-variant text-xs">{member.user.email}</p>
        </div>
      </div>
    ),
  },
  {
    key: "groups",
    header: "Groupes",
    render: (member) => (
      <div className="flex flex-wrap gap-1.5">
        {member.groups.map((g) => (
          <Badge key={g.id}>{g.name}</Badge>
        ))}
      </div>
    ),
  },
];

export default function MembersPage() {
  const activeWorkspace = useSessionStore((s) => s.activeWorkspace);
  const { can } = usePermissions();

  const [members, setMembers] = useState<Member[]>([]);
  const [total, setTotal] = useState(0);
  const [groups, setGroups] = useState<Group[]>([]);
  const [permissionCatalog, setPermissionCatalog] = useState<AppPermissionGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [managingMember, setManagingMember] = useState<Member | null>(null);

  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [page, setPage] = useState(0);
  const [refetchToken, setRefetchToken] = useState(0);

  const workspaceId = activeWorkspace?.id;
  const canView = can("members.view");

  useEffect(() => {
    const timeout = setTimeout(() => setDebouncedQuery(query), 300);
    return () => clearTimeout(timeout);
  }, [query]);

  useEffect(() => {
    if (!workspaceId || !canView) return;

    listGroups(workspaceId)
      .then((res) => setGroups(res.groups))
      .catch(() => {});
    listPermissions()
      .then((res) => setPermissionCatalog(res.groups))
      .catch(() => {});
  }, [workspaceId, canView]);

  useEffect(() => {
    if (!workspaceId || !canView) {
      setLoading(false);
      return;
    }

    setLoading(true);
    listMembers(workspaceId, {
      search: debouncedQuery,
      limit: PAGE_SIZE,
      offset: page * PAGE_SIZE,
    })
      .then((res) => {
        setMembers(res.members);
        setTotal(res.total);
        setError(null);
      })
      .catch((err) => {
        setError(err instanceof ApiError ? err.message : "Une erreur est survenue");
      })
      .finally(() => setLoading(false));
  }, [workspaceId, canView, debouncedQuery, page, refetchToken]);

  async function handleRemove(member: Member) {
    if (!workspaceId) return;
    if (!confirm(`Retirer ${member.user.username} du workspace ?`)) return;

    try {
      await removeMember(workspaceId, member.id);
      setSelectedMember(null);
      setRefetchToken((t) => t + 1);
    } catch (err) {
      alert(err instanceof ApiError ? err.message : "Une erreur est survenue");
    }
  }

  if (!canView) {
    return (
      <div className="p-8 max-w-5xl mx-auto">
        <h1 className="text-2xl font-bold text-on-surface">Membres</h1>
        <p className="text-sm text-on-surface-variant mt-1">
          Vous n&apos;avez pas accès à cette page.
        </p>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-on-surface">Membres</h1>
          <p className="text-sm text-on-surface-variant mt-1">
            {total} membre{total > 1 ? "s" : ""}
          </p>
        </div>
        <div className="flex gap-2">
          {can("groups.manage") && (
            <Link
              href="/members/groups"
              className="flex items-center gap-2 px-4 py-2 rounded-xl border border-outline-variant text-sm font-medium text-on-surface hover:bg-surface-container transition-colors"
            >
              <SettingsOutlined style={{ fontSize: 18 }} />
              Gérer les groupes
            </Link>
          )}
          {can("members.invite") && (
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-on-primary text-sm font-medium"
            >
              <PersonAddOutlined style={{ fontSize: 18 }} />
              Ajouter un membre
            </button>
          )}
        </div>
      </div>

      {error && (
        <p className="text-sm text-error bg-error-container/40 rounded-lg px-3 py-2">
          {error}
        </p>
      )}

      <DataList
        serverMode
        items={members}
        totalCount={total}
        loading={loading}
        columns={MEMBER_COLUMNS}
        getRowKey={(member) => member.id}
        onRowClick={setSelectedMember}
        onSearchChange={(q) => {
          setQuery(q);
          setPage(0);
        }}
        onPageChange={setPage}
        pageSize={PAGE_SIZE}
        searchPlaceholder="Rechercher un membre…"
        emptyMessage="Aucun membre."
      />

      {showAddModal && workspaceId && (
        <AddMemberModal
          workspaceId={workspaceId}
          groups={groups}
          onClose={() => setShowAddModal(false)}
          onCreated={() => setRefetchToken((t) => t + 1)}
        />
      )}

      {selectedMember && workspaceId && (
        <MemberDetailDrawer
          member={selectedMember}
          canManage={can("members.manage")}
          canRemove={can("members.remove")}
          onClose={() => setSelectedMember(null)}
          onManage={() => setManagingMember(selectedMember)}
          onRemove={() => handleRemove(selectedMember)}
        />
      )}

      {managingMember && workspaceId && (
        <MemberPermissionsModal
          workspaceId={workspaceId}
          member={managingMember}
          groups={groups}
          permissionCatalog={permissionCatalog}
          onClose={() => setManagingMember(null)}
          onUpdated={(updated) => {
            setSelectedMember(updated);
            setRefetchToken((t) => t + 1);
          }}
        />
      )}
    </div>
  );
}
