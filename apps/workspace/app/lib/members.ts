import type { ChipTone } from "@repo/ui/Chip";
import type { AppPermissionGroup, Group, Member } from "./types";

export type MemberRole = "owner" | "admin" | "member";

export const ROLE_LABELS: Record<MemberRole, string> = {
  owner: "Owner",
  admin: "Admin",
  member: "Membre",
};

export const ROLE_TONES: Record<MemberRole, ChipTone> = {
  owner: "primary",
  admin: "info",
  member: "neutral",
};

// Le backend ne stocke pas de rôle : il se déduit de la propriété du workspace
// et des droits d'administration effectivement détenus.
const ADMIN_PERMISSIONS = ["workspace.settings.manage", "members.manage", "groups.manage"];

export function memberRole(member: Member): MemberRole {
  if (member.is_owner) return "owner";
  return member.permissions.some((p) => ADMIN_PERMISSIONS.includes(p)) ? "admin" : "member";
}

export interface EffectivePermission {
  key: string;
  label: string;
  /** `null` = accordé en direct ; sinon le nom du groupe qui l'apporte. */
  fromGroup: string | null;
}

export interface EffectivePermissionApp {
  app: string;
  permissions: EffectivePermission[];
}

/**
 * Croise le catalogue de permissions, les droits effectifs du membre et les
 * permissions de ses groupes pour restituer, par application, chaque droit
 * détenu et sa provenance.
 */
export function effectivePermissions(
  member: Member,
  catalog: AppPermissionGroup[],
  groups: Group[]
): EffectivePermissionApp[] {
  const held = new Set(member.permissions);
  const directIds = new Set(member.direct_permissions.map((p) => p.id));

  const memberGroupNames = new Set(member.groups.map((g) => g.id));
  const sourceGroups = groups.filter((g) => memberGroupNames.has(g.id));

  return catalog
    .map((app) => ({
      app: app.name,
      permissions: app.permissions
        .filter((p) => held.has(p.name))
        .map((p) => ({
          key: p.name,
          label: p.description ?? p.name,
          fromGroup: directIds.has(p.id)
            ? null
            : (sourceGroups.find((g) => g.permissions.some((gp) => gp.id === p.id))?.name ?? null),
        })),
    }))
    .filter((app) => app.permissions.length > 0);
}

export function generatePassword(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
  const bytes = new Uint32Array(12);
  crypto.getRandomValues(bytes);
  const chars = Array.from(bytes, (n) => alphabet[n % alphabet.length]);
  return `${chars.slice(0, 4).join("")}-${chars.slice(4, 8).join("")}-${chars.slice(8).join("")}`;
}
