"use client";

import { useMemo, useState } from "react";
import {
  CheckOutlined,
  CloseOutlined,
  LockOutlined,
  LockResetOutlined,
  VisibilityOffOutlined,
  VisibilityOutlined,
} from "@mui/icons-material";
import { RightDrawer } from "@repo/ui/RightDrawer";
import { Avatar } from "@repo/ui/Avatar";
import { Chip } from "@repo/ui/Chip";
import { MultiSelect } from "@repo/ui/MultiSelect";
import { PermissionPicker } from "@repo/ui/PermissionPicker";
import type { AppPermissionGroup, Group, Member } from "@/app/lib/types";
import {
  ROLE_LABELS,
  ROLE_TONES,
  effectivePermissions,
  memberRole,
} from "@/app/lib/members";
import {
  ApiError,
  resetMemberPassword,
  setMemberGroups,
  setMemberPermissions,
} from "@/app/lib/api";
import {
  EffectivePermissionsList,
  PermissionSourceLegend,
} from "./members/EffectivePermissionsList";

const SECTION_LABEL = "text-label-sm uppercase text-outline";

export function MemberDetailDrawer({
  member,
  workspaceId,
  groups,
  permissionCatalog,
  canManage,
  canRemove,
  onClose,
  onUpdated,
  onRemove,
}: {
  member: Member;
  workspaceId: number;
  groups: Group[];
  permissionCatalog: AppPermissionGroup[];
  canManage: boolean;
  canRemove: boolean;
  onClose: () => void;
  onUpdated: (member: Member) => void;
  onRemove: () => void;
}) {
  const [panel, setPanel] = useState<"none" | "permissions" | "password">("none");

  const role = memberRole(member);
  const effective = useMemo(
    () => effectivePermissions(member, permissionCatalog, groups),
    [member, permissionCatalog, groups]
  );

  return (
    <RightDrawer
      title={member.user.username}
      onClose={onClose}
      width="w-[460px] max-w-[92vw]"
      footer={
        canManage || canRemove ? (
          <>
            {canManage && (
              <>
                <SecondaryButton
                  active={panel === "permissions"}
                  onClick={() => setPanel(panel === "permissions" ? "none" : "permissions")}
                >
                  Gérer les permissions
                </SecondaryButton>
                <SecondaryButton
                  active={panel === "password"}
                  onClick={() => setPanel(panel === "password" ? "none" : "password")}
                >
                  <LockOutlined style={{ fontSize: 13 }} />
                  Réinitialiser le mot de passe
                </SecondaryButton>
              </>
            )}
            {canRemove && !member.is_owner && (
              <button
                onClick={onRemove}
                className="ml-auto h-[34px] px-3 rounded-lg text-label-md font-semibold text-error hover:bg-error-container transition-colors"
              >
                Retirer du workspace
              </button>
            )}
          </>
        ) : undefined
      }
    >
      <div className="flex items-center gap-3.5 mb-5">
        <Avatar name={member.user.username} letters={1} size={44} />
        <div className="min-w-0">
          <p className="text-[15px] font-semibold text-on-surface truncate">
            {member.user.username}
          </p>
          <p className="text-body-sm text-outline truncate">{member.user.email}</p>
        </div>
      </div>

      <div className="flex gap-6 mb-5">
        <div>
          <p className={`${SECTION_LABEL} mb-1.5`}>Rôle</p>
          <Chip tone={ROLE_TONES[role]}>{ROLE_LABELS[role]}</Chip>
        </div>
        <div>
          <p className={`${SECTION_LABEL} mb-1.5`}>Statut</p>
          {member.is_active === false ? (
            <Chip tone="warning">Suspendu</Chip>
          ) : (
            <Chip tone="success">Actif</Chip>
          )}
        </div>
        <div>
          <p className={`${SECTION_LABEL} mb-1.5`}>Dernière connexion</p>
          <p className="text-body-sm text-on-surface pt-0.5">
            {member.last_login_at
              ? new Date(member.last_login_at).toLocaleDateString("fr-FR")
              : "—"}
          </p>
        </div>
      </div>

      <p className={`${SECTION_LABEL} mb-2`}>Groupes</p>
      <div className="flex flex-wrap gap-1.5 mb-5">
        {member.groups.length === 0 ? (
          <span className="text-body-sm text-outline">Aucun groupe.</span>
        ) : (
          member.groups.map((g) => (
            <Chip key={g.id} size="sm">
              {g.name}
            </Chip>
          ))
        )}
      </div>

      <div className="flex items-center justify-between mb-2">
        <p className={SECTION_LABEL}>Permissions effectives</p>
        <PermissionSourceLegend />
      </div>
      <EffectivePermissionsList apps={effective} />

      {panel === "permissions" && (
        <PermissionsPanel
          member={member}
          workspaceId={workspaceId}
          groups={groups}
          permissionCatalog={permissionCatalog}
          onClose={() => setPanel("none")}
          onUpdated={onUpdated}
        />
      )}

      {panel === "password" && (
        <PasswordPanel
          member={member}
          workspaceId={workspaceId}
          onClose={() => setPanel("none")}
        />
      )}
    </RightDrawer>
  );
}

function SecondaryButton({
  children,
  active,
  onClick,
}: {
  children: React.ReactNode;
  active?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 h-[34px] px-3 rounded-lg border text-label-md font-semibold transition-colors ${
        active
          ? "border-primary/40 bg-primary/5 text-primary"
          : "border-outline-soft bg-surface-container-lowest text-on-surface-variant hover:bg-surface-container-low"
      }`}
    >
      {children}
    </button>
  );
}

function PanelShell({
  title,
  tone = "primary",
  icon,
  onClose,
  children,
}: {
  title: string;
  tone?: "primary" | "error";
  icon?: React.ReactNode;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div
      className={`mt-4 rounded-xl border overflow-hidden animate-pop-in ${
        tone === "error" ? "border-error-container bg-error-container/20" : "border-primary-fixed-dim bg-background"
      }`}
    >
      <div className="flex items-center gap-2 px-3.5 py-3 border-b border-outline-soft">
        {icon}
        <span
          className={`flex-1 text-body-sm font-semibold ${
            tone === "error" ? "text-on-error-container" : "text-on-surface"
          }`}
        >
          {title}
        </span>
        <button
          onClick={onClose}
          aria-label="Fermer le panneau"
          className="w-[26px] h-[26px] flex items-center justify-center rounded-md text-outline hover:bg-surface-container transition-colors"
        >
          <CloseOutlined style={{ fontSize: 15 }} />
        </button>
      </div>
      {children}
    </div>
  );
}

function PermissionsPanel({
  member,
  workspaceId,
  groups,
  permissionCatalog,
  onClose,
  onUpdated,
}: {
  member: Member;
  workspaceId: number;
  groups: Group[];
  permissionCatalog: AppPermissionGroup[];
  onClose: () => void;
  onUpdated: (member: Member) => void;
}) {
  const [groupIds, setGroupIds] = useState<number[]>(member.groups.map((g) => g.id));
  const [permissionIds, setPermissionIds] = useState<number[]>(
    member.direct_permissions.map((p) => p.id)
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function togglePermission(id: number) {
    setPermissionIds((prev) => (prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]));
  }

  async function save() {
    setError(null);
    setSaving(true);
    try {
      await setMemberGroups(workspaceId, member.id, groupIds);
      const updated = await setMemberPermissions(workspaceId, member.id, permissionIds);
      onUpdated(updated);
      onClose();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Une erreur est survenue");
    } finally {
      setSaving(false);
    }
  }

  return (
    <PanelShell title="Groupes et permissions directes" onClose={onClose}>
      <div className="px-3.5 py-3.5 space-y-4">
        {error && <p className="text-body-sm text-error">{error}</p>}

        <div className="space-y-1.5">
          <p className="text-body-sm font-medium text-on-surface">Groupes</p>
          {groups.length === 0 ? (
            <p className="text-body-sm text-on-surface-variant">Aucun groupe créé.</p>
          ) : (
            <MultiSelect
              options={groups.map((g) => ({ id: g.id, label: g.name }))}
              selectedIds={groupIds}
              onChange={(ids) => setGroupIds(ids as number[])}
              placeholder="Rechercher un groupe…"
              emptyLabel="Aucun groupe trouvé."
            />
          )}
        </div>

        <div className="space-y-1.5">
          <p className="text-body-sm font-medium text-on-surface">Permissions directes</p>
          <PermissionPicker
            groups={permissionCatalog}
            selectedIds={permissionIds}
            onToggle={togglePermission}
          />
        </div>
      </div>

      <div className="flex justify-end gap-2 px-3.5 py-3 bg-surface-container-lowest border-t border-outline-soft">
        <button
          onClick={onClose}
          disabled={saving}
          className="h-8 px-3.5 rounded-lg border border-outline-soft text-label-md font-semibold text-on-surface-variant hover:bg-surface-container-low transition-colors"
        >
          Annuler
        </button>
        <button
          onClick={save}
          disabled={saving}
          className="h-8 px-4 rounded-lg bg-primary text-on-primary text-label-md font-semibold shadow-button hover:bg-primary-container disabled:opacity-50 transition-colors"
        >
          {saving ? "Enregistrement…" : "Enregistrer"}
        </button>
      </div>
    </PanelShell>
  );
}

function PasswordPanel({
  member,
  workspaceId,
  onClose,
}: {
  member: Member;
  workspaceId: number;
  onClose: () => void;
}) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [visible, setVisible] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password.length < 8) {
      setError("Le mot de passe doit contenir au moins 8 caractères.");
      return;
    }
    if (password !== confirm) {
      setError("Les mots de passe ne correspondent pas.");
      return;
    }
    setSaving(true);
    try {
      await resetMemberPassword(workspaceId, member.id, password);
      setSuccess(true);
      setPassword("");
      setConfirm("");
      setTimeout(onClose, 2000);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Une erreur est survenue.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <PanelShell
      title="Réinitialiser le mot de passe"
      tone="error"
      icon={<LockResetOutlined style={{ fontSize: 15 }} className="text-error" />}
      onClose={onClose}
    >
      <div className="px-3.5 py-3.5">
        {success ? (
          <p className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-member-active-container text-body-sm font-medium text-member-active">
            <CheckOutlined style={{ fontSize: 15 }} />
            Mot de passe réinitialisé.
          </p>
        ) : (
          <form onSubmit={submit} className="space-y-2.5">
            <div className="relative">
              <input
                type={visible ? "text" : "password"}
                placeholder="Nouveau mot de passe"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={saving}
                autoFocus
                className="w-full h-9 pl-3 pr-10 rounded-lg border border-outline-soft bg-surface-container-lowest text-body-sm text-on-surface outline-none focus:border-primary"
              />
              <button
                type="button"
                tabIndex={-1}
                onClick={() => setVisible((v) => !v)}
                aria-label={visible ? "Masquer" : "Afficher"}
                className="absolute right-1.5 top-1.5 w-[26px] h-[26px] flex items-center justify-center rounded-md text-outline hover:text-on-surface"
              >
                {visible ? (
                  <VisibilityOffOutlined style={{ fontSize: 15 }} />
                ) : (
                  <VisibilityOutlined style={{ fontSize: 15 }} />
                )}
              </button>
            </div>
            <input
              type={visible ? "text" : "password"}
              placeholder="Confirmer le mot de passe"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              disabled={saving}
              className="w-full h-9 px-3 rounded-lg border border-outline-soft bg-surface-container-lowest text-body-sm text-on-surface outline-none focus:border-primary"
            />
            {error && <p className="text-[11px] text-error">{error}</p>}
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                disabled={saving}
                className="h-8 px-3.5 rounded-lg border border-outline-soft bg-surface-container-lowest text-label-md font-semibold text-on-surface-variant hover:bg-surface-container-low transition-colors"
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={saving}
                className="h-8 px-4 rounded-lg bg-error text-on-error text-label-md font-semibold disabled:opacity-50"
              >
                {saving ? "En cours…" : "Réinitialiser"}
              </button>
            </div>
          </form>
        )}
      </div>
    </PanelShell>
  );
}
