"use client";

import type { ReactNode } from "react";

/** Briques d'écran partagées par les sections d'une promotion.
 *
 *  Elles restent DANS l'app : « carte de section académique » ne veut rien dire
 *  hors d'Academia. Ce qui est réutilisable ailleurs vit déjà dans `@repo/ui`.
 */

export function Carte({
  titre,
  sousTitre,
  action,
  children,
}: {
  titre?: string;
  sousTitre?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-2xl border border-outline-soft bg-surface-container-lowest">
      {(titre || action) && (
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-hairline px-4 py-3">
          <div className="min-w-0">
            {titre && <h2 className="text-body-md font-semibold text-on-surface">{titre}</h2>}
            {sousTitre && <p className="mt-0.5 text-label-md text-outline">{sousTitre}</p>}
          </div>
          {action}
        </header>
      )}
      {children}
    </section>
  );
}

export function Erreur({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <p className="rounded-lg bg-error-container/40 px-3 py-2 text-body-sm text-error">{message}</p>
  );
}

/** Un bandeau pour ce que l'écran a fait ET ce qu'il n'a PAS fait.
 *
 *  C'est le motif qui revient partout dans ce module : reprise de programme,
 *  saisie en masse, génération d'examens, décision de recours. Un compte seul
 *  ne dit pas ce qu'on a perdu ; on liste.
 */
export function Bilan({
  titre,
  ecarts,
  ton = "info",
  onFermer,
}: {
  titre: string;
  ecarts?: string[];
  ton?: "info" | "alerte";
  onFermer?: () => void;
}) {
  const fond =
    ton === "alerte" ? "bg-error-container/30 border-error/30" : "bg-surface-container-low border-outline-soft";
  return (
    <div className={`rounded-xl border px-3 py-2.5 ${fond}`}>
      <div className="flex items-start justify-between gap-3">
        <p className="text-body-sm font-medium text-on-surface">{titre}</p>
        {onFermer && (
          <button
            type="button"
            onClick={onFermer}
            className="text-label-md text-on-surface-variant hover:text-on-surface"
          >
            Fermer
          </button>
        )}
      </div>
      {ecarts && ecarts.length > 0 && (
        <ul className="mt-1 space-y-0.5">
          {ecarts.map((e, n) => (
            <li key={n} className="text-label-md text-on-surface-variant">
              {e}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function Vide({ message, children }: { message: string; children?: ReactNode }) {
  return (
    <div className="px-4 py-10 text-center">
      <p className="text-body-sm text-on-surface-variant">{message}</p>
      {children && <div className="mt-3">{children}</div>}
    </div>
  );
}

const TONS: Record<string, string> = {
  neutre: "bg-surface-container text-on-surface-variant",
  ok: "bg-secondary/15 text-secondary",
  attente: "bg-primary/10 text-primary",
  alerte: "bg-error-container/60 text-error",
  info: "bg-tertiary/12 text-tertiary",
};

export function Pastille({
  children,
  ton = "neutre",
  titre,
}: {
  children: ReactNode;
  ton?: keyof typeof TONS | string;
  titre?: string;
}) {
  return (
    <span
      title={titre}
      className={`inline-flex flex-none items-center gap-1 rounded-full px-2 py-0.5 text-label-md font-medium ${
        TONS[ton] ?? TONS.neutre
      }`}
    >
      {children}
    </span>
  );
}

export function Kpi({ valeur, libelle }: { valeur: ReactNode; libelle: string }) {
  return (
    <div className="rounded-xl border border-outline-soft bg-surface-container-lowest px-3 py-2.5">
      <p className="font-display text-headline-sm tabular-nums text-on-surface">{valeur}</p>
      <p className="text-label-md text-outline">{libelle}</p>
    </div>
  );
}

export const CHAMP =
  "h-9 rounded-lg border border-outline-soft bg-surface-container-lowest px-3 text-body-sm text-on-surface outline-none transition-colors focus:border-primary disabled:opacity-60";

export const BOUTON =
  "inline-flex h-9 items-center gap-1.5 rounded-lg bg-primary px-4 text-body-sm font-semibold text-on-primary transition-colors hover:bg-primary-container disabled:opacity-50";

export const BOUTON_PLAT =
  "inline-flex h-9 items-center gap-1.5 rounded-lg border border-outline-soft px-3 text-body-sm font-medium text-on-surface-variant transition-colors hover:border-primary hover:text-primary disabled:opacity-50";
