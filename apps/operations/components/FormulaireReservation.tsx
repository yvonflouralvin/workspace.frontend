"use client";

import { useMemo, useState } from "react";
import type { Salle } from "@/lib/operations-api";

const CHAMP =
  "h-9 w-full rounded-lg border border-outline-soft bg-surface-container-lowest px-3 text-body-sm text-on-surface outline-none transition-colors focus:border-primary";

export function FormulaireReservation({
  salles, salleChoisie, jour, peutValider, enCours, onClose, onSubmit,
}: {
  salles: Salle[];
  salleChoisie?: Salle;
  jour: Date;
  peutValider: boolean;
  enCours?: boolean;
  onClose: () => void;
  onSubmit: (corps: Record<string, unknown>) => void;
}) {
  const [salleId, setSalleId] = useState<number | "">(salleChoisie?.id ?? "");
  const [date, setDate] = useState(() => isoLocal(jour));
  const [debut, setDebut] = useState("09:00");
  const [fin, setFin] = useState("12:00");
  const [objet, setObjet] = useState("");
  const [erreur, setErreur] = useState<string | null>(null);

  // Une réunion qui se termine « après minuit » appartient au lendemain : on le
  // déduit plutôt que de réclamer deux dates pour un créneau du soir.
  const bornes = useMemo(() => {
    const finJour = fin <= debut ? jourSuivant(date) : date;
    return { debut: `${date}T${debut}:00`, fin: `${finJour}T${fin}:00`, minuit: fin <= debut };
  }, [date, debut, fin]);

  const salle = salles.find((s) => s.id === salleId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-overlay p-4 animate-overlay-in">
      <div className="w-full max-w-[30rem] rounded-2xl bg-surface-container-lowest shadow-modal animate-pop-in">
        <div className="border-b border-outline-soft px-5 py-4">
          <h2 className="text-body-lg font-medium text-on-surface">
            {peutValider ? "Réserver une salle" : "Demander une salle"}
          </h2>
          {!peutValider && (
            <p className="mt-0.5 text-body-sm text-on-surface-variant">
              Votre demande n&apos;occupe pas la salle tant qu&apos;elle n&apos;est pas acceptée.
            </p>
          )}
        </div>

        <div className="flex flex-col gap-3 px-5 py-4">
          {erreur && <p className="text-body-sm text-error">{erreur}</p>}

          <label className="flex flex-col gap-1">
            <span className="text-label-md text-on-surface-variant">Salle *</span>
            <select
              value={salleId}
              onChange={(e) => setSalleId(e.target.value ? Number(e.target.value) : "")}
              className={CHAMP}
            >
              <option value="">Choisir…</option>
              {salles.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.libelle}
                  {s.capacite ? ` — ${s.capacite} places` : ""}
                </option>
              ))}
            </select>
            {salle?.capacite ? (
              <span className="text-label-md text-on-surface-variant">
                Capacité : {salle.capacite} personnes.
              </span>
            ) : null}
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-label-md text-on-surface-variant">Date</span>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={CHAMP} />
          </label>

          <div className="grid grid-cols-2 gap-3">
            <label className="flex flex-col gap-1">
              <span className="text-label-md text-on-surface-variant">De</span>
              <input type="time" value={debut} onChange={(e) => setDebut(e.target.value)} className={CHAMP} />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-label-md text-on-surface-variant">À</span>
              <input type="time" value={fin} onChange={(e) => setFin(e.target.value)} className={CHAMP} />
            </label>
          </div>
          {bornes.minuit && (
            <p className="text-label-md text-on-surface-variant">
              La fin précède le début : la réservation se termine le lendemain.
            </p>
          )}

          <label className="flex flex-col gap-1">
            <span className="text-label-md text-on-surface-variant">Objet</span>
            <input
              value={objet}
              onChange={(e) => setObjet(e.target.value)}
              placeholder="Ex. : culte du dimanche, réunion des diacres"
              className={CHAMP}
            />
          </label>
        </div>

        <div className="flex justify-end gap-2 border-t border-outline-soft px-5 py-3">
          <button type="button" onClick={onClose} className="h-9 rounded-lg px-4 text-body-sm font-medium text-on-surface-variant hover:bg-surface-container-low">
            Annuler
          </button>
          <button
            type="button"
            disabled={enCours}
            onClick={() => {
              if (!salleId) { setErreur("Choisissez une salle."); return; }
              setErreur(null);
              onSubmit({
                salle_id: Number(salleId),
                debut: bornes.debut,
                fin: bornes.fin,
                objet: objet.trim() || null,
              });
            }}
            className="h-9 rounded-lg bg-primary px-4 text-body-sm font-semibold text-on-primary shadow-button disabled:opacity-50"
          >
            {enCours ? "…" : peutValider ? "Réserver" : "Envoyer la demande"}
          </button>
        </div>
      </div>
    </div>
  );
}

function isoLocal(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function jourSuivant(iso: string) {
  const d = new Date(`${iso}T12:00:00`);
  d.setDate(d.getDate() + 1);
  return isoLocal(d);
}
