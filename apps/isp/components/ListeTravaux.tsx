"use client";

import { useState } from "react";
import type { Memoire, Projet } from "@/app/lib/api";

const TEINTE: Record<string, string> = {
  DEPOSE: "bg-surface-container text-on-surface-variant",
  VALIDE: "bg-secondary/15 text-secondary",
  REFUSE: "bg-error-container/60 text-error",
  SOUTENU: "bg-tertiary/15 text-tertiary",
};

/** Un travail encadré, mémoire ou projet — la forme est la même.
 *
 *  Un composant plutôt que deux : ce qui les distingue tient au sujet et aux
 *  membres, pas à la façon dont on les instruit. Deux composants jumeaux
 *  auraient divergé au premier correctif.
 */
export function CarteTravail({
  titre,
  sousTitre,
  travail,
  peutInstruire,
  onDecision,
}: {
  titre: string;
  sousTitre: string;
  travail: Memoire | Projet;
  peutInstruire: boolean;
  onDecision: (statut: string, motif?: string) => Promise<void>;
}) {
  const [motif, setMotif] = useState("");
  const [refus, setRefus] = useState(false);

  return (
    <article className="rounded-2xl border border-outline-soft bg-surface-container-lowest p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-body-md font-medium text-on-surface">{titre}</p>
          <p className="text-label-md text-outline">{sousTitre}</p>
        </div>
        <span
          className={`flex-none rounded-full px-2 py-0.5 text-label-md ${TEINTE[travail.statut] ?? ""}`}
        >
          {travail.statut_libelle}
        </span>
      </div>

      {travail.motif && (
        <p className="mt-2 rounded-lg bg-surface-container-low px-3 py-2 text-body-sm text-on-surface-variant">
          {travail.motif}
        </p>
      )}

      {travail.soumissions.length > 0 && (
        <ul className="mt-2 space-y-0.5">
          {travail.soumissions.map((s) => (
            <li key={s.id} className="text-label-md text-on-surface-variant">
              {s.nom_fichier}
              {s.commentaire && ` — ${s.commentaire}`}
            </li>
          ))}
        </ul>
      )}

      {peutInstruire && (travail.statut === "DEPOSE" || travail.statut === "VALIDE") && (
        <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-outline-soft pt-3">
          {travail.statut === "DEPOSE" && (
            <>
              <button
                type="button"
                onClick={() => onDecision("VALIDE")}
                className="h-8 rounded-lg bg-primary px-3 text-body-sm font-semibold text-on-primary transition-colors hover:bg-primary-container"
              >
                Valider le sujet
              </button>
              {refus ? (
                <>
                  <input
                    className="h-8 min-w-[220px] flex-1 rounded-lg border border-outline-soft bg-surface-container-lowest px-3 text-body-sm text-on-surface outline-none focus:border-primary"
                    placeholder="Motif du refus — obligatoire"
                    value={motif}
                    onChange={(e) => setMotif(e.target.value)}
                  />
                  <button
                    type="button"
                    disabled={!motif.trim()}
                    onClick={() => onDecision("REFUSE", motif)}
                    className="h-8 rounded-lg border border-outline-soft px-3 text-body-sm text-error transition-colors hover:bg-surface-container-low disabled:opacity-50"
                  >
                    Confirmer le refus
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => setRefus(true)}
                  className="h-8 rounded-lg border border-outline-soft px-3 text-body-sm text-on-surface-variant transition-colors hover:text-error"
                >
                  Refuser
                </button>
              )}
            </>
          )}
          {travail.statut === "VALIDE" && (
            <button
              type="button"
              onClick={() => onDecision("SOUTENU")}
              className="h-8 rounded-lg bg-primary px-3 text-body-sm font-semibold text-on-primary transition-colors hover:bg-primary-container"
            >
              Marquer soutenu
            </button>
          )}
        </div>
      )}
    </article>
  );
}
