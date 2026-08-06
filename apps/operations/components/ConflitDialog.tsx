"use client";

import { useState } from "react";
import { WarningAmberOutlined } from "@mui/icons-material";
import type { Conflit } from "@/lib/operations-api";
import { heureCourte, jourCourt } from "@/lib/operations-api";

/** Ce que l'écran fait d'un `409`.
 *
 *  Un chevauchement n'est pas une erreur de saisie : c'est une information —
 *  « cette personne est déjà là, à cette heure, sur ce site ». On la montre, et
 *  selon le droit de l'utilisateur on propose de justifier ou on s'arrête.
 *
 *  Afficher un message d'erreur sec obligerait l'utilisateur à aller chercher
 *  lui-même ce qui bloque, dans un calendrier qu'il vient de quitter. */
export function ConflitDialog({
  conflit,
  onAnnuler,
  onForcer,
  enCours,
}: {
  conflit: Conflit;
  onAnnuler: () => void;
  onForcer: (motif: string) => void;
  enCours?: boolean;
}) {
  const [motif, setMotif] = useState("");
  const [erreur, setErreur] = useState<string | null>(null);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-overlay p-4 animate-overlay-in">
      <div className="w-full max-w-[34rem] rounded-2xl bg-surface-container-lowest shadow-modal animate-pop-in">
        <div className="flex items-start gap-3 border-b border-outline-soft px-5 py-4">
          <span className="mt-0.5 text-error">
            <WarningAmberOutlined style={{ fontSize: 20 }} />
          </span>
          <div>
            <h2 className="text-body-lg font-medium text-on-surface">Créneau déjà occupé</h2>
            <p className="mt-0.5 text-body-sm text-on-surface-variant">{conflit.message}</p>
          </div>
        </div>

        <div className="max-h-[40vh] overflow-y-auto px-5 py-4">
          <p className="mb-2 text-label-md uppercase text-outline">Ce qui occupe déjà le créneau</p>
          <ul className="flex flex-col gap-2">
            {conflit.conflits.map((c) => (
              <li
                key={c.affectation_id}
                className="rounded-xl border border-outline-soft px-3 py-2 text-body-sm"
              >
                <span className="font-medium text-on-surface">{c.ressource}</span>
                <span className="text-on-surface-variant">
                  {" — "}
                  {jourCourt(c.debut)} {heureCourte(c.debut)}–{heureCourte(c.fin)}
                  {c.site ? ` · ${c.site}` : ""}
                  {c.planning ? ` · ${c.planning}` : ""}
                </span>
              </li>
            ))}
          </ul>

          {conflit.forcage_possible ? (
            <div className="mt-4">
              <label className="text-label-md text-on-surface-variant" htmlFor="motif">
                Pourquoi maintenir cette affectation ?
              </label>
              <textarea
                id="motif"
                rows={3}
                value={motif}
                onChange={(e) => setMotif(e.target.value)}
                placeholder="Ex. : renfort demandé par le client, accord du chef d'équipe"
                className="mt-1 w-full rounded-lg border border-outline-soft bg-surface-container-lowest px-3 py-2 text-body-sm text-on-surface outline-none transition-colors focus:border-primary"
              />
              <p className="mt-1 text-label-md text-on-surface-variant">
                La justification reste attachée à l&apos;affectation : c&apos;est ce qui permettra
                de comprendre l&apos;exception plus tard.
              </p>
              {erreur && <p className="mt-1 text-label-md text-error">{erreur}</p>}
            </div>
          ) : (
            <p className="mt-4 rounded-lg bg-surface-container px-3 py-2 text-body-sm text-on-surface-variant">
              Vous n&apos;avez pas le droit de passer outre un chevauchement. Modifiez
              l&apos;horaire, ou demandez à un responsable planning.
            </p>
          )}
        </div>

        <div className="flex justify-end gap-2 border-t border-outline-soft px-5 py-3">
          <button
            type="button"
            onClick={onAnnuler}
            className="h-9 rounded-lg px-4 text-body-sm font-medium text-on-surface-variant transition-colors hover:bg-surface-container-low"
          >
            {conflit.forcage_possible ? "Annuler" : "Fermer"}
          </button>
          {conflit.forcage_possible && (
            <button
              type="button"
              disabled={enCours}
              onClick={() => {
                if (!motif.trim()) {
                  setErreur("Une justification est demandée.");
                  return;
                }
                setErreur(null);
                onForcer(motif.trim());
              }}
              className="h-9 rounded-lg bg-error px-4 text-body-sm font-semibold text-on-primary shadow-button transition-colors disabled:opacity-50"
            >
              {enCours ? "…" : "Maintenir malgré tout"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
