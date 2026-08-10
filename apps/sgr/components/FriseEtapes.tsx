"use client";

import { CheckCircleOutlined, RadioButtonUncheckedOutlined } from "@mui/icons-material";
import type { Etape } from "@/app/lib/api";

/** Où en est le dossier — la question que le candidat se pose chaque semaine.
 *
 *  Une frise plutôt qu'une étiquette : « en cours de validation » ne dit pas ce
 *  qui a déjà été fait, ni ce qu'il reste. Les dates franchies répondent au
 *  « depuis quand ? » que la plateforme d'origine laissait sans réponse.
 */
export function FriseEtapes({ etapes }: { etapes: Etape[] }) {
  return (
    <ol className="space-y-0">
      {etapes.map((etape, i) => (
        <li key={etape.cle} className="flex gap-3">
          <div className="flex flex-col items-center">
            <span
              className={
                etape.franchie
                  ? "text-secondary"
                  : etape.courante
                    ? "text-primary"
                    : "text-outline-variant"
              }
            >
              {etape.franchie ? (
                <CheckCircleOutlined style={{ fontSize: 20 }} />
              ) : (
                <RadioButtonUncheckedOutlined style={{ fontSize: 20 }} />
              )}
            </span>
            {i < etapes.length - 1 && (
              <span
                className={`w-px flex-1 ${etape.franchie ? "bg-secondary/40" : "bg-outline-soft"}`}
                style={{ minHeight: 24 }}
              />
            )}
          </div>
          <div className="pb-5">
            <p
              className={`text-body-sm ${
                etape.courante
                  ? "font-semibold text-on-surface"
                  : etape.franchie
                    ? "text-on-surface"
                    : "text-on-surface-variant"
              }`}
            >
              {etape.libelle}
            </p>
            {etape.le && (
              <p className="text-label-md text-outline">
                {new Date(etape.le).toLocaleDateString("fr-FR", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </p>
            )}
          </div>
        </li>
      ))}
    </ol>
  );
}
