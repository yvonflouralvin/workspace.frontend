"use client";

import { RightDrawer } from "@repo/ui/RightDrawer";
import { Badge } from "@repo/ui/Badge";
import type { Member } from "@/app/lib/types";

export function MemberDetailDrawer({
  member,
  canManage,
  canRemove,
  onClose,
  onManage,
  onRemove,
}: {
  member: Member;
  canManage: boolean;
  canRemove: boolean;
  onClose: () => void;
  onManage: () => void;
  onRemove: () => void;
}) {
  return (
    <RightDrawer title={member.user.username} onClose={onClose}>
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <span className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-bold flex-shrink-0">
            {member.user.username[0]?.toUpperCase() ?? "?"}
          </span>
          <div>
            <p className="text-on-surface font-medium">
              {member.user.username}
              {member.is_owner && (
                <span className="ml-2 text-xs text-on-surface-variant">(owner)</span>
              )}
            </p>
            <p className="text-on-surface-variant text-sm">{member.user.email}</p>
          </div>
        </div>

        <div className="space-y-1">
          <p className="text-sm font-medium text-on-surface">Groupes</p>
          {member.groups.length === 0 ? (
            <p className="text-sm text-on-surface-variant">Aucun groupe.</p>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {member.groups.map((g) => (
                <Badge key={g.id}>{g.name}</Badge>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-1">
          <p className="text-sm font-medium text-on-surface">Permissions effectives</p>
          {member.permissions.length === 0 ? (
            <p className="text-sm text-on-surface-variant">Aucune permission.</p>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {member.permissions.map((permission) => (
                <Badge key={permission}>{permission}</Badge>
              ))}
            </div>
          )}
        </div>

        <div className="flex gap-2 pt-2">
          {canManage && (
            <button
              onClick={onManage}
              className="px-4 py-2 rounded-xl text-sm font-medium border border-outline-variant text-on-surface hover:bg-surface-container transition-colors"
            >
              Gérer les permissions
            </button>
          )}
          {canRemove && !member.is_owner && (
            <button
              onClick={onRemove}
              className="px-4 py-2 rounded-xl text-sm font-medium text-error hover:bg-error-container/40 transition-colors"
            >
              Retirer du workspace
            </button>
          )}
        </div>
      </div>
    </RightDrawer>
  );
}
