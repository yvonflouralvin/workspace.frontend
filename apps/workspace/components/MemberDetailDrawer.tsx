"use client";

import { useMemo, useState } from "react";
import {
  CheckOutlined,
  CloseOutlined,
  BadgeOutlined,
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
  setMemberProfil,
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
  const [panel, setPanel] = useState<"none" | "profil" | "permissions" | "password">("none");

  const role = memberRole(member);
  const effective = useMemo(
    () => effectivePermissions(member, permissionCatalog, groups),
    [member, permissionCatalog, groups]
  );

  return (
    <RightDrawer
      title={member.user.username}
      onClose={onClose}
      width="md:w-[460px] md:max-w-[92vw]"
      footer={
        canManage || canRemove ? (
          <>
            {canManage && (
              <>
                <SecondaryButton
                  active={panel === "profil"}
                  onClick={() => setPanel(panel === "profil" ? "none" : "profil")}
                >
                  <BadgeOutlined style={{ fontSize: 13 }} />
                  Titre et attributions
                </SecondaryButton>
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

      <p className={`${SECTION_LABEL} mb-1.5`}>Ce qu&apos;il ou elle fait ici</p>
      {member.titre || member.attributions ? (
        <div className="mb-5">
          {member.titre && (
            <p className="text-body-md font-medium text-on-surface">{member.titre}</p>
          )}
          {member.attributions && (
            <p className="mt-0.5 whitespace-pre-wrap text-body-sm text-on-surface-variant">
              {member.attributions}
            </p>
          )}
        </div>
      ) : (
        <p className="mb-5 text-body-sm text-outline">
          Rien d&apos;indiqué — personne ne peut deviner à quoi s&apos;adresser à
          cette personne, et les collaborateurs virtuels pas davantage.
        </p>
      )}

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

      {panel === "profil" && (
        <ProfilPanel
          member={member}
          workspaceId={workspaceId}
          onClose={() => setPanel("none")}
          onUpdated={onUpdated}
        />
      )}

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

function ProfilPanel({
  member,
  workspaceId,
  onClose,
  onUpdated,
}: {
  member: Member;
  workspaceId: number;
  onClose: () => void;
  onUpdated: (member: Member) => void;
}) {
  const [titre, setTitre] = useState(member.titre ?? "");
  const [attributions, setAttributions] = useState(member.attributions ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setError(null);
    setSaving(true);
    try {
      onUpdated(await setMemberProfil(workspaceId, member.id, { titre, attributions }));
      onClose();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Une erreur est survenue");
    } finally {
      setSaving(false);
    }
  }

  return (
    <PanelShell title="Titre et attributions" onClose={onClose}>
      <div className="px-3.5 py-3.5 space-y-4">
        {error && <p className="text-body-sm text-error">{error}</p>}

        <p className="text-body-sm text-on-surface-variant">
          Ce n&apos;est pas un droit, c&apos;est un repère : à quoi sert cette personne
          dans l&apos;organisation. Les collègues s&apos;en servent pour savoir à qui
          s&apos;adresser — et les collaborateurs virtuels aussi, quand ils butent sur
          ce qu&apos;ils ne savent pas faire.
        </p>

        <div className="space-y-1.5">
          <label className="block text-body-sm font-medium text-on-surface" htmlFor="titre-membre">
            Titre
          </label>
          <input
            id="titre-membre"
            type="text"
            value={titre}
            maxLength={120}
            onChange={(e) => setTitre(e.target.value)}
            placeholder="Responsable commercial"
            className="w-full rounded-lg border border-outline-soft bg-surface-container-lowest px-3 py-2 text-body-md text-on-surface placeholder:text-outline focus:border-primary focus:outline-none"
          />
        </div>

        <div className="space-y-1.5">
          <label
            className="block text-body-sm font-medium text-on-surface"
            htmlFor="attributions-membre"
          >
            Attributions
          </label>
          <textarea
            id="attributions-membre"
            value={attributions}
            rows={4}
            onChange={(e) => setAttributions(e.target.value)}
            placeholder="Clients et prospects, devis, factures, suivi des paiements et relances."
            className="w-full resize-y rounded-lg border border-outline-soft bg-surface-container-lowest px-3 py-2 text-body-md text-on-surface placeholder:text-outline focus:border-primary focus:outline-none"
          />
          <p className="text-label-sm text-outline">
            Une ou deux phrases concrètes. « Gère les paiements fournisseurs » oriente ;
            « Participe à la vie de l&apos;entreprise » n&apos;oriente personne.
          </p>
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
            // Une app désactivée n'a plus de droit à accorder ici — un droit
            // déjà tenu depuis une app depuis désactivée reste dans
            // `permissionIds` (donc conservé à l'enregistrement), juste plus
            // proposé à l'ajout.
            groups={permissionCatalog.filter((g) => g.actif)}
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
