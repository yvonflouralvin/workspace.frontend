import { LockOutlined } from "@mui/icons-material";

/**
 * Marque un objet publié par une autre application : ses champs sensibles ne
 * s'éditent que depuis l'app propriétaire. Teinte ambre dédiée, distincte de
 * tous les statuts métier.
 */
export function LockedBadge({ appLabel }: { appLabel: string }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-md bg-locked-container px-1.5 py-0.5 text-[11px] font-semibold text-locked">
      <LockOutlined style={{ fontSize: 11 }} />
      {appLabel}
    </span>
  );
}

export function LockedBanner({
  appLabel,
  children,
}: {
  appLabel: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-2.5 rounded-xl bg-locked-container/60 border border-locked-container px-3.5 py-3">
      <LockOutlined style={{ fontSize: 16 }} className="flex-none mt-0.5 text-locked" />
      <p className="text-body-sm text-on-surface-variant">
        {children ?? (
          <>
            Cet élément est publié par l&apos;application <strong>{appLabel}</strong>. Les champs
            verrouillés ne se modifient que depuis cette application.
          </>
        )}
      </p>
    </div>
  );
}
