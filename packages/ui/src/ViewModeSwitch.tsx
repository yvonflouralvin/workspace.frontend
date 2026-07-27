"use client";

import type { ReactNode } from "react";

export interface ViewModeOption<T extends string> {
  value: T;
  icon: ReactNode;
  /** Infobulle + libellé accessible : l'icône seule ne dit pas le mode. */
  label: string;
}

/** Sélecteur de mode d'affichage (liste / kanban / grille…) — segmenté, icônes seules.
 *  Aligné en hauteur sur les boutons d'action pour tenir sur la même ligne. */
export function ViewModeSwitch<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: ViewModeOption<T>[];
  onChange: (value: T) => void;
}) {
  return (
    <div
      role="group"
      className="inline-flex items-center gap-0.5 h-11 md:h-[38px] p-0.5 rounded-lg border border-outline-soft bg-surface-container-lowest"
    >
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            title={option.label}
            aria-label={option.label}
            aria-pressed={active}
            onClick={() => onChange(option.value)}
            className={`w-10 md:w-9 h-full flex items-center justify-center rounded-md transition-colors ${
              active
                ? "bg-surface-container text-primary"
                : "text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface"
            }`}
          >
            {option.icon}
          </button>
        );
      })}
    </div>
  );
}
