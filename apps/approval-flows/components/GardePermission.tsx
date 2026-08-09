"use client";

import { LockOutlined } from "@mui/icons-material";
import { usePermissions } from "@repo/auth/hooks/usePermissions";

/** Rend le contenu, ou un refus explicite.
 *
 *  Une garde sur la PAGE et pas seulement sur le menu : une adresse se
 *  partage, se met en favori, se devine. Masquer l'entrée de navigation sans
 *  protéger l'écran ne cache rien à qui tape l'URL — et laisse croire à
 *  l'utilisateur qu'il peut agir jusqu'au refus du serveur.
 */
export function GardePermission({
  permission,
  children,
  quoi,
}: {
  permission: string;
  children: React.ReactNode;
  /** Ce à quoi l'accès est refusé, pour un message qui dit quelque chose. */
  quoi: string;
}) {
  const { can } = usePermissions();

  if (can(permission)) return <>{children}</>;

  return (
    <div className="mx-auto max-w-[1024px] p-4 md:p-8">
      <div className="rounded-2xl border border-outline-soft bg-surface-container-lowest px-4 py-12 text-center">
        <LockOutlined style={{ fontSize: 30 }} className="text-outline" />
        <h1 className="mt-3 text-body-lg font-medium text-on-surface">{quoi}</h1>
        <p className="mx-auto mt-1 max-w-[46ch] text-body-sm text-on-surface-variant">
          Vous n&apos;avez pas le droit d&apos;accéder à cette section. Demandez à un
          administrateur du workspace de vous ajouter au groupe qui le permet.
        </p>
      </div>
    </div>
  );
}
