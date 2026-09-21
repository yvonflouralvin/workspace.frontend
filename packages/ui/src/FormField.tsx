import type { ReactNode } from "react";

/** Le style d'un contrôle de formulaire (champ, liste, zone de texte) pleine largeur. */
export const FORM_CONTROL =
  "w-full rounded-lg border border-outline-soft bg-surface-container-lowest px-3 py-2 text-body-md text-on-surface outline-none focus:border-primary transition-colors disabled:opacity-60";

/** Un champ de formulaire : son libellé au-dessus, le contrôle dessous. */
export function FormField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <span className="block text-label-sm uppercase text-outline mb-1.5">{label}</span>
      {children}
    </div>
  );
}
