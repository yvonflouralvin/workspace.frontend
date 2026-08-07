"use client";

import { useState } from "react";
import { heureCourte, type Reservation } from "@/lib/operations-api";

/** Accepter ou refuser une demande de salle.
 *
 *  Le motif est OBLIGATOIRE au refus : sans lui, le demandeur ne sait pas quoi
 *  corriger et reviendra demander la même chose. Il est facultatif à
 *  l'acceptation — il n'y a rien à justifier quand on dit oui. */
export function DecisionDialog({
  reservation, action, enCours, onClose, onConfirm,
}: {
  reservation: Reservation;
  action: "accepter" | "refuser";
  enCours?: boolean;
  onClose: () => void;
  onConfirm: (motif: string) => void;
}) {
  const [motif, setMotif] = useState("");
  const [erreur, setErreur] = useState<string | null>(null);
  const refus = action === "refuser";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-overlay p-4 animate-overlay-in">
      <div className="w-full max-w-[28rem] rounded-2xl bg-surface-container-lowest shadow-modal animate-pop-in">
        <div className="border-b border-outline-soft px-5 py-4">
          <h2 className="text-body-lg font-medium text-on-surface">
            {refus ? "Refuser la demande" : "Accepter la demande"}
          </h2>
          <p className="mt-0.5 text-body-sm text-on-surface-variant">
            {reservation.salle} — {new Date(reservation.debut).toLocaleDateString("fr-FR")}{" "}
            {heureCourte(reservation.debut)}–{heureCourte(reservation.fin)}
            {reservation.demandeur ? ` · ${reservation.demandeur}` : ""}
          </p>
        </div>

        <div className="flex flex-col gap-2 px-5 py-4">
          {erreur && <p className="text-body-sm text-error">{erreur}</p>}
          <label className="flex flex-col gap-1">
            <span className="text-label-md text-on-surface-variant">
              {refus ? "Motif du refus *" : "Note (facultative)"}
            </span>
            <textarea
              rows={3}
              value={motif}
              onChange={(e) => setMotif(e.target.value)}
              placeholder={refus ? "Ex. : salle déjà retenue pour l'assemblée générale" : ""}
              className="w-full rounded-lg border border-outline-soft bg-surface-container-lowest px-3 py-2 text-body-sm text-on-surface outline-none focus:border-primary"
            />
          </label>
          {refus && (
            <p className="text-label-md text-on-surface-variant">
              Le demandeur verra ce motif — c&apos;est ce qui lui permet de proposer autre chose.
            </p>
          )}
          {!refus && (
            <p className="text-label-md text-on-surface-variant">
              Accepter occupe le créneau. Si la salle a été prise entre-temps, un conflit
              vous sera signalé.
            </p>
          )}
        </div>

        <div className="flex justify-end gap-2 border-t border-outline-soft px-5 py-3">
          <button type="button" onClick={onClose} className="h-9 rounded-lg px-4 text-body-sm font-medium text-on-surface-variant hover:bg-surface-container-low">
            Annuler
          </button>
          <button
            type="button"
            disabled={enCours}
            onClick={() => {
              if (refus && !motif.trim()) { setErreur("Le motif du refus est requis."); return; }
              setErreur(null);
              onConfirm(motif.trim());
            }}
            className={`h-9 rounded-lg px-4 text-body-sm font-semibold text-on-primary shadow-button disabled:opacity-50 ${refus ? "bg-error" : "bg-primary"}`}
          >
            {enCours ? "…" : refus ? "Refuser" : "Accepter"}
          </button>
        </div>
      </div>
    </div>
  );
}
