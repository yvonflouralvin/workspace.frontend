"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { PersonAddOutlined, SettingsOutlined } from "@mui/icons-material";
import { useSessionStore } from "@repo/auth/store/session.store";
import { usePermissions } from "@repo/auth/hooks/usePermissions";
import { Badge } from "@repo/ui/Badge";
import {
  listMembers,
  listGroups,
  listPermissions,
  removeMember,
  ApiError,
} from "@/app/lib/api";
import type { Member, Group, PermissionDef } from "@/app/lib/types";
import { AddMemberModal } from "@/components/AddMemberModal";
import { MemberPermissionsModal } from "@/components/MemberPermissionsModal";

export default function MembersPage() {
  const activeWorkspace = useSessionStore((s) => s.activeWorkspace);
  const { can } = usePermissions();

  const [members, setMembers] = useState<Member[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [permissionCatalog, setPermissionCatalog] = useState<PermissionDef[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [managingMember, setManagingMember] = useState<Member | null>(null);

  const workspaceId = activeWorkspace?.id;
  const canView = can("members.view");

  useEffect(() => {
    if (!workspaceId || !canView) {
      setLoading(false);
      return;
    }

    Promise.all([
      listMembers(workspaceId),
      listGroups(workspaceId),
      listPermissions(),
    ])
      .then(([membersRes, groupsRes, permissionsRes]) => {
        setMembers(membersRes.members);
        setGroups(groupsRes.groups);
        setPermissionCatalog(permissionsRes.permissions);
      })
      .catch((err) => {
        setError(err instanceof ApiError ? err.message : "Une erreur est survenue");
      })
      .finally(() => setLoading(false));
  }, [workspaceId, canView]);

  async function handleRemove(member: Member) {
    if (!workspaceId) return;
    if (!confirm(`Retirer ${member.user.username} du workspace ?`)) return;

    try {
      await removeMember(workspaceId, member.id);
      setMembers((prev) => prev.filter((m) => m.id !== member.id));
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
            {members.length} membre{members.length > 1 ? "s" : ""}
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

      {loading ? (
        <p className="text-sm text-on-surface-variant">Chargement…</p>
      ) : (
        <div className="rounded-2xl border border-outline-variant bg-surface-container-lowest overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-outline-variant text-left text-on-surface-variant">
                <th className="px-5 py-3 font-medium">Membre</th>
                <th className="px-5 py-3 font-medium">Groupes</th>
                <th className="px-5 py-3 font-medium w-32"></th>
              </tr>
            </thead>
            <tbody>
              {members.map((member) => (
                <tr key={member.id} className="border-b border-outline-variant last:border-0">
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      <span className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold flex-shrink-0">
                        {member.user.username[0]?.toUpperCase() ?? "?"}
                      </span>
                      <div>
                        <p className="text-on-surface font-medium">
                          {member.user.username}
                          {member.is_owner && (
                            <span className="ml-2 text-xs text-on-surface-variant">
                              (owner)
                            </span>
                          )}
                        </p>
                        <p className="text-on-surface-variant text-xs">{member.user.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex flex-wrap gap-1.5">
                      {member.groups.map((g) => (
                        <Badge key={g.id}>{g.name}</Badge>
                      ))}
                    </div>
                  </td>
                  <td className="px-5 py-3 text-right space-x-3">
                    {can("members.manage") && (
                      <button
                        onClick={() => setManagingMember(member)}
                        className="text-primary text-xs font-medium hover:underline"
                      >
                        Gérer
                      </button>
                    )}
                    {can("members.remove") && !member.is_owner && (
                      <button
                        onClick={() => handleRemove(member)}
                        className="text-error text-xs font-medium hover:underline"
                      >
                        Retirer
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showAddModal && workspaceId && (
        <AddMemberModal
          workspaceId={workspaceId}
          groups={groups}
          onClose={() => setShowAddModal(false)}
          onCreated={(member) => setMembers((prev) => [...prev, member])}
        />
      )}

      {managingMember && workspaceId && (
        <MemberPermissionsModal
          workspaceId={workspaceId}
          member={managingMember}
          groups={groups}
          permissionCatalog={permissionCatalog}
          onClose={() => setManagingMember(null)}
          onUpdated={(updated) =>
            setMembers((prev) => prev.map((m) => (m.id === updated.id ? updated : m)))
          }
        />
      )}
    </div>
  );
}
