"use client";

import { useState } from "react";
import { WarningAmberOutlined } from "@mui/icons-material";
import type { RefusWip } from "@/app/lib/projects-api";

/** Dialogue de franchissement d'une limite de simultanéité.
 *
 *  La justification est OBLIGATOIRE — le backend la refuse vide, autant
 *  l'empêcher avant l'erreur. Quand le dépassement est interdit sur la phase,
 *  aucun champ n'est proposé : on explique et on ferme. */
export function ForcageWipDialog({
  refus,
  busy,
  onConfirm,
  onCancel,
}: {
  refus: RefusWip;
  busy: boolean;
  onConfirm: (motif: string) => void;
  onCancel: () => void;
}) {
  const [motif, setMotif] = useState("");

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-overlay animate-overlay-in p-4"
      role="dialog"
      aria-modal="true"
      onClick={onCancel}
    >
      <div
        className="w-full max-w-[28rem] rounded-2xl bg-surface-container-lowest shadow-modal animate-pop-in p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-3">
          <span className="flex-none w-9 h-9 rounded-full bg-error-container text-error flex items-center justify-center">
            <WarningAmberOutlined style={{ fontSize: 20 }} />
          </span>
          <div className="min-w-0">
            <h2 className="font-display text-headline-sm text-on-surface">
              « {refus.etat} » est à sa limite
            </h2>
            <p className="mt-1 text-body-sm text-on-surface-variant">
              {refus.effectif} élément{refus.effectif > 1 ? "s" : ""} pour une limite de{" "}
              {refus.limite}. Une limite de travail simultané sert à finir avant de commencer.
            </p>
          </div>
        </div>

        {refus.forcage_possible ? (
          <>
            <label className="block text-label-sm uppercase text-outline mt-4 mb-1.5" htmlFor="motif-forcage">
              Justification du dépassement
            </label>
            <textarea
              id="motif-forcage"
              value={motif}
              onChange={(e) => setMotif(e.target.value)}
              rows={3}
              autoFocus
              placeholder="Pourquoi cet élément passe malgré la limite…"
              className="w-full rounded-lg border border-outline-soft bg-surface-container-lowest px-3 py-2 text-body-sm text-on-surface outline-none focus:border-primary transition-colors resize-none"
            />
            <p className="mt-1.5 text-label-md text-outline">
              Elle sera conservée avec votre nom et l&apos;horodatage, à côté de la limite
              franchie.
            </p>
          </>
        ) : (
          <p className="mt-4 text-body-sm text-on-surface-variant">
            Le dépassement est interdit sur cette phase. Terminez un élément en cours, ou
            faites modifier la limite dans les outils de la phase.
          </p>
        )}

        <div className="flex justify-end gap-2 mt-5">
          <button
            type="button"
            onClick={onCancel}
            className="h-9 px-4 rounded-lg text-body-sm font-semibold text-on-surface-variant hover:bg-surface-container-low transition-colors"
          >
            {refus.forcage_possible ? "Annuler" : "Fermer"}
          </button>
          {refus.forcage_possible && (
            <button
              type="button"
              disabled={busy || !motif.trim()}
              title={!motif.trim() ? "La justification est obligatoire" : undefined}
              onClick={() => onConfirm(motif.trim())}
              className="h-9 px-4 rounded-lg bg-error text-on-error text-body-sm font-semibold shadow-button hover:opacity-90 disabled:opacity-50 transition-opacity"
            >
              Dépasser la limite
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
