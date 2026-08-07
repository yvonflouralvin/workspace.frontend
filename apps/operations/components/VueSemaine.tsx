"use client";

import { useMemo, useState } from "react";
import { AddOutlined, WarningAmberOutlined } from "@mui/icons-material";
import { heureCourte, type Affectation } from "@/lib/operations-api";

/** Combien de créneaux une colonne montre avant de résumer. */
const MAX_PAR_JOUR = 8;

/** La semaine : sept colonnes, une par jour, et dans chacune la liste de ce qui
 *  est affecté ce jour-là.
 *
 *  Pas de lignes d'heures ici. Sur sept jours, une trame horaire coûte
 *  vingt-quatre lignes pour n'apprendre qu'une chose — l'heure — que le créneau
 *  écrit déjà en toutes lettres. La question de la semaine est « qui, quel
 *  jour » ; celle de l'heure précise se pose dans la vue Jour. */
export function VueSemaine({
  jours,
  affectations,
  onJourVide,
  onAffectation,
}: {
  jours: Date[];
  affectations: Affectation[];
  onJourVide?: (jour: Date) => void;
  onAffectation?: (a: Affectation) => void;
}) {
  const [deplie, setDeplie] = useState<string | null>(null);

  /** `colonnes[j]` — les créneaux du jour j, du plus matinal au plus tardif.
   *  Un créneau qui franchit minuit apparaît dans les DEUX jours qu'il touche :
   *  une ronde de 22 h à 6 h occupe bien l'agent le lendemain matin. */
  const colonnes = useMemo(
    () =>
      jours.map((jour) => {
        const j0 = new Date(jour);
        j0.setHours(0, 0, 0, 0);
        const j1 = new Date(j0.getTime() + 86_400_000);
        return affectations
          .filter((a) => new Date(a.debut) < j1 && new Date(a.fin) > j0)
          .map((a) => ({ a, ...borner(a, j0, j1) }))
          .sort((x, y) => x.debut.getTime() - y.debut.getTime());
      }),
    [jours, affectations],
  );

  return (
    <div className="overflow-x-auto rounded-2xl border border-outline-variant">
      <div
        className="grid items-stretch"
        style={{ gridTemplateColumns: `repeat(${jours.length}, minmax(0, 1fr))`, minWidth: 840 }}
      >
        {jours.map((jour, j) => {
          const aujourdhui = jour.toDateString() === new Date().toDateString();
          const weekend = jour.getDay() === 0 || jour.getDay() === 6;
          const lignes = colonnes[j];
          const ouvert = deplie === String(j);
          const visibles = ouvert ? lignes : lignes.slice(0, MAX_PAR_JOUR);
          const reste = lignes.length - visibles.length;

          return (
            <div
              key={jour.toISOString()}
              className={`flex min-h-[18rem] flex-col ${j > 0 ? "border-l border-outline-variant" : ""} ${
                weekend ? "bg-surface-container-low/50" : ""
              }`}
            >
              <div
                className={`border-b border-outline-variant px-2 py-2 text-center ${
                  aujourdhui ? "bg-primary/10 text-primary" : "text-on-surface-variant"
                }`}
              >
                <p className="text-label-md capitalize">
                  {jour.toLocaleDateString("fr-FR", { weekday: "long" })}
                </p>
                <p className="text-body-md font-medium text-on-surface">{jour.getDate()}</p>
              </div>

              <div className="flex flex-1 flex-col gap-1 p-1.5">
                {visibles.map(({ a, debut, fin, depuisLaVeille, versLeLendemain }) => (
                  <button
                    key={a.id}
                    type="button"
                    onClick={() => onAffectation?.(a)}
                    title={`${a.ressource} · ${heureCourte(a.debut)}–${heureCourte(a.fin)}${a.site ? ` · ${a.site}` : ""}${a.objet ? ` · ${a.objet}` : ""}`}
                    className={`flex flex-col gap-0.5 rounded-lg border-l-[3px] px-2 py-1.5 text-left transition-colors ${
                      a.en_chevauchement
                        ? "bg-error-container/50 hover:bg-error-container"
                        : "bg-surface-container-low hover:bg-surface-container"
                    }`}
                    style={{ borderLeftColor: a.site_couleur ?? "var(--color-primary)" }}
                  >
                    <span className="flex items-center gap-1 text-label-md text-on-surface-variant">
                      {a.en_chevauchement && (
                        <WarningAmberOutlined style={{ fontSize: 12 }} className="flex-none text-error" />
                      )}
                      {depuisLaVeille && "…"}
                      {formaterHeure(debut)}–{formaterHeure(fin)}
                      {versLeLendemain && "…"}
                    </span>
                    <span className="truncate text-body-sm font-medium text-on-surface">
                      {a.ressource ?? "—"}
                    </span>
                    {(a.site || a.objet) && (
                      <span className="truncate text-label-sm text-on-surface-variant">
                        {a.objet ?? a.site}
                      </span>
                    )}
                  </button>
                ))}

                {reste > 0 && (
                  <button
                    type="button"
                    onClick={() => setDeplie(String(j))}
                    className="rounded-lg px-2 py-1 text-left text-label-md text-primary hover:bg-surface-container-low"
                  >
                    +{reste} de plus
                  </button>
                )}
                {ouvert && lignes.length > MAX_PAR_JOUR && (
                  <button
                    type="button"
                    onClick={() => setDeplie(null)}
                    className="rounded-lg px-2 text-left text-label-md text-on-surface-variant"
                  >
                    replier
                  </button>
                )}

                {onJourVide && (
                  <button
                    type="button"
                    onClick={() => onJourVide(jour)}
                    aria-label={`Affecter le ${jour.toLocaleDateString("fr-FR")}`}
                    className="mt-auto flex min-h-[2rem] items-center justify-center rounded-lg text-outline opacity-0 transition-opacity hover:bg-surface-container hover:opacity-100 focus-visible:opacity-100"
                  >
                    <AddOutlined style={{ fontSize: 16 }} />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/** Le créneau ramené aux bornes du jour affiché, en gardant trace de ce qui
 *  déborde — sans quoi une ronde de nuit s'afficherait « 22:00–06:00 » sur les
 *  deux jours et laisserait croire à deux vacations. */
export function borner(a: Affectation, j0: Date, j1: Date) {
  const debut = new Date(a.debut);
  const fin = new Date(a.fin);
  return {
    debut: debut < j0 ? j0 : debut,
    fin: fin > j1 ? j1 : fin,
    depuisLaVeille: debut < j0,
    versLeLendemain: fin > j1,
  };
}

function formaterHeure(d: Date) {
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}
