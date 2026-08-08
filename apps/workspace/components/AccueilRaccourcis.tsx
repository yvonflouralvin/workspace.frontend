"use client";

import Link from "next/link";
import * as Icones from "@mui/icons-material";
import { PLATFORM_APPS } from "@repo/ui/shell/platform";
import type { AccueilResolu } from "@/app/lib/types";

/** L'accueil d'un groupe qui a choisi des raccourcis plutôt que des widgets.
 *
 *  Pensé pour des membres qui n'ont que quelques gestes à faire : un agent de
 *  sécurité y trouve le planning des salles et le démarrage d'un groupe, pas
 *  une liste de tâches ni un fil de notifications qui ne le concernent pas.
 */
export function AccueilRaccourcis({
  accueil,
  prenom,
}: {
  accueil: AccueilResolu;
  prenom?: string;
}) {
  return (
    <div className="p-4 md:p-8">
      <h1 className="font-display text-headline-md text-on-surface">
        Bonjour{prenom ? ` ${prenom}` : ""}
      </h1>
      <p className="mt-1 text-body-md text-on-surface-variant">
        Vos accès rapides
        {accueil.groupe ? ` — ${accueil.groupe.name}` : ""}.
      </p>

      <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {accueil.liens_rapides.map((lien) => {
          const app = PLATFORM_APPS.find((a) => a.id === lien.app_key);
          // Une app inconnue (désactivée depuis, renommée) ne casse pas la
          // grille : on saute la carte plutôt que d'afficher un lien mort.
          if (!app) return null;
          const href = `${app.url.replace(/\/$/, "")}${lien.chemin ?? ""}`;
          const Icone = lien.icone
            ? (Icones as Record<string, React.ElementType>)[`${lien.icone}Outlined`]
            : null;

          return (
            <Link
              key={lien.id ?? `${lien.app_key}-${lien.position}`}
              href={href}
              className="group rounded-2xl border border-outline-soft bg-surface-container-lowest p-5 transition-colors hover:border-primary"
            >
              <span
                className="flex h-11 w-11 items-center justify-center rounded-xl text-on-primary"
                style={{ backgroundColor: app.color }}
              >
                {Icone ? <Icone style={{ fontSize: 22 }} /> : app.icon}
              </span>
              <p className="mt-3 text-body-lg font-medium text-on-surface group-hover:text-primary">
                {lien.libelle}
              </p>
              <p className="mt-0.5 text-body-sm text-on-surface-variant">
                {lien.description || app.name}
              </p>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
