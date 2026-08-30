"use client";

import type { Process } from "@/lib/operations-api";

/** La checklist telle qu'on la LIT, pour qui n'a pas à l'écrire.
 *
 *  L'écran de conception est un éditeur : des champs de saisie, des boutons de
 *  suppression, un panneau de partage. Le servir en lecture seule à un agent
 *  qui passe la ronde lui montre un contenu qu'il ne peut pas toucher et lui
 *  cache ce qu'il est venu voir — ce qu'il devra contrôler, et ce qu'on attend
 *  de lui à chaque point.
 *
 *  Les consignes et les aides s'affichent ICI intégralement : c'est le seul
 *  endroit où on peut lire le process avant de le commencer.
 */
export function ChecklistLecture({ process }: { process: Process }) {
  if (process.sections.length === 0) {
    return (
      <p className="mt-4 rounded-2xl border border-dashed border-outline-soft px-4 py-8 text-center text-body-sm text-on-surface-variant">
        Ce process n&apos;a aucun point de contrôle.
      </p>
    );
  }

  return (
    <div className="mt-4 space-y-3">
      {process.sections.map((section) => (
        <section
          key={section.id}
          className="rounded-2xl border border-outline-soft bg-surface-container-lowest p-4"
        >
          <h3 className="text-body-md font-semibold text-on-surface">{section.titre}</h3>
          {section.consigne && (
            <p className="mt-0.5 max-w-[70ch] text-body-sm text-on-surface-variant">
              {section.consigne}
            </p>
          )}

          <ol className="mt-3 space-y-2">
            {section.points.map((point, i) => (
              <li key={point.id} className="flex gap-2 border-t border-hairline pt-2">
                <span className="w-5 shrink-0 text-right text-label-md text-outline">
                  {i + 1}.
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-body-sm text-on-surface">
                    {point.libelle}
                    {!point.obligatoire && (
                      <span className="ml-1.5 text-label-sm text-outline">(facultatif)</span>
                    )}
                  </span>
                  {point.aide && (
                    <span className="mt-0.5 block text-label-md text-on-surface-variant">
                      {point.aide}
                    </span>
                  )}
                  <span className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-label-md text-outline">
                    <span>{point.type_libelle}</span>
                    {(point.minimum !== null || point.maximum !== null) && (
                      <span>
                        · attendu {point.minimum ?? "—"} à {point.maximum ?? "—"}
                        {point.unite ? ` ${point.unite}` : ""}
                      </span>
                    )}
                    {point.unite && point.minimum === null && point.maximum === null && (
                      <span>· en {point.unite}</span>
                    )}
                    {point.options.length > 0 && <span>· {point.options.join(" / ")}</span>}
                  </span>
                </span>
              </li>
            ))}
          </ol>
        </section>
      ))}
    </div>
  );
}
