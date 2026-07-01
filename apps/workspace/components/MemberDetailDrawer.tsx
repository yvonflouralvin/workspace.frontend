"use client";

import { useState } from "react";
import { LockResetOutlined } from "@mui/icons-material";
import { RightDrawer } from "@repo/ui/RightDrawer";
import { Badge } from "@repo/ui/Badge";
import type { Member } from "@/app/lib/types";
import { resetMemberPassword, ApiError } from "@/app/lib/api";

export function MemberDetailDrawer({
  member,
  workspaceId,
  canManage,
  canRemove,
  onClose,
  onManage,
  onRemove,
}: {
  member: Member;
  workspaceId: number;
  canManage: boolean;
  canRemove: boolean;
  onClose: () => void;
  onManage: () => void;
  onRemove: () => void;
}) {
  const [showResetForm, setShowResetForm] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [resetLoading, setResetLoading] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);
  const [resetSuccess, setResetSuccess] = useState(false);

  async function handleResetSubmit(e: React.FormEvent) {
    e.preventDefault();
    setResetError(null);

    if (newPassword.length < 8) {
      setResetError("Le mot de passe doit contenir au moins 8 caractères.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setResetError("Les mots de passe ne correspondent pas.");
      return;
    }

    setResetLoading(true);
    try {
      await resetMemberPassword(workspaceId, member.id, newPassword);
      setResetSuccess(true);
      setNewPassword("");
      setConfirmPassword("");
      setTimeout(() => {
        setResetSuccess(false);
        setShowResetForm(false);
      }, 2000);
    } catch (err) {
      setResetError(err instanceof ApiError ? err.message : "Une erreur est survenue.");
    } finally {
      setResetLoading(false);
    }
  }

  function handleCancelReset() {
    setShowResetForm(false);
    setNewPassword("");
    setConfirmPassword("");
    setResetError(null);
    setResetSuccess(false);
  }

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

        {canManage && showResetForm && (
          <div className="border border-outline-variant rounded-xl p-4 space-y-3">
            <p className="text-sm font-medium text-on-surface">Nouveau mot de passe</p>
            <form onSubmit={handleResetSubmit} className="space-y-3">
              <input
                type="password"
                placeholder="Nouveau mot de passe"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-outline-variant bg-surface focus:outline-none focus:border-primary"
                autoFocus
                disabled={resetLoading}
              />
              <input
                type="password"
                placeholder="Confirmer le mot de passe"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-outline-variant bg-surface focus:outline-none focus:border-primary"
                disabled={resetLoading}
              />
              {resetError && (
                <p className="text-xs text-error">{resetError}</p>
              )}
              {resetSuccess && (
                <p className="text-xs text-secondary font-medium">Mot de passe réinitialisé.</p>
              )}
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={resetLoading}
                  className="px-4 py-2 rounded-xl text-sm font-medium bg-primary text-on-primary hover:bg-primary-container transition-colors disabled:opacity-50"
                >
                  {resetLoading ? "En cours…" : "Confirmer"}
                </button>
                <button
                  type="button"
                  onClick={handleCancelReset}
                  disabled={resetLoading}
                  className="px-4 py-2 rounded-xl text-sm font-medium border border-outline-variant text-on-surface hover:bg-surface-container transition-colors"
                >
                  Annuler
                </button>
              </div>
            </form>
          </div>
        )}

        <div className="flex flex-wrap gap-2 pt-2">
          {canManage && (
            <button
              onClick={onManage}
              className="px-4 py-2 rounded-xl text-sm font-medium border border-outline-variant text-on-surface hover:bg-surface-container transition-colors"
            >
              Gérer les permissions
            </button>
          )}
          {canManage && !showResetForm && (
            <button
              onClick={() => setShowResetForm(true)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium border border-outline-variant text-on-surface hover:bg-surface-container transition-colors"
            >
              <LockResetOutlined style={{ fontSize: 16 }} />
              Réinitialiser le mot de passe
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
