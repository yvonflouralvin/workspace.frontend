"use client";

import { useMemo, useState } from "react";
import { WarningAmberOutlined } from "@mui/icons-material";
import { heureCourte, type Affectation } from "@/lib/operations-api";

/** Combien de vignettes tiennent dans une case avant de résumer.
 *
 *  Au-delà, la case grandit et la grille perd son alignement : les lignes
 *  d'heures ne se lisent plus les unes par rapport aux autres, ce qui est
 *  pourtant l'intérêt d'une grille. */
const MAX_PAR_CASE = 3;

export interface CaseCliquee {
  jour: Date;
  heure: number;
  affectations: Affectation[];
}

/** La grille : les heures en lignes, les jours en colonnes.
 *
 *  Une affectation de 8 h à 16 h apparaît sur CHAQUE ligne qu'elle couvre, pas
 *  seulement sur celle de son début. La question qu'on pose à une grille
 *  horaire est « qui est là à 14 h ? » — un bloc qui ne s'inscrirait qu'à 8 h
 *  laisserait la ligne de 14 h vide alors que la personne y travaille.
 */
export function GrilleHoraire({
  jours,
  affectations,
  heureDebut = 6,
  heureFin = 23,
  onCase,
  onAffectation,
}: {
  jours: Date[];
  affectations: Affectation[];
  heureDebut?: number;
  heureFin?: number;
  onCase?: (c: CaseCliquee) => void;
  onAffectation?: (a: Affectation) => void;
}) {
  const [toutesLesHeures, setToutesLesHeures] = useState(false);
  const [deplie, setDeplie] = useState<string | null>(null);

  const bornes = toutesLesHeures ? { de: 0, a: 23 } : { de: heureDebut, a: heureFin };

  /** `cases[jour][heure]` — une affectation est inscrite sur toutes les heures
   *  qu'elle couvre, y compris quand elle franchit minuit. */
  const cases = useMemo(() => {
    const table: Affectation[][][] = jours.map(() => Array.from({ length: 24 }, () => []));
    for (const a of affectations) {
      const debut = new Date(a.debut);
      const fin = new Date(a.fin);
      for (let j = 0; j < jours.length; j++) {
        const jour = jours[j];
        for (let h = 0; h < 24; h++) {
          const creneauDebut = new Date(jour);
          creneauDebut.setHours(h, 0, 0, 0);
          const creneauFin = new Date(creneauDebut.getTime() + 3_600_000);
          // Bornes strictes : une prestation qui finit à 16 h n'occupe pas la
          // ligne de 16 h — elle est partie.
          if (debut < creneauFin && fin > creneauDebut) table[j][h].push(a);
        }
      }
    }
    return table;
  }, [jours, affectations]);

  /** Les heures qui portent quelque chose, pour proposer de replier le reste. */
  const heuresUtiles = useMemo(() => {
    const set = new Set<number>();
    cases.forEach((jour) => jour.forEach((lignes, h) => lignes.length && set.add(h)));
    return set;
  }, [cases]);

  const heures = Array.from({ length: bornes.a - bornes.de + 1 }, (_, i) => bornes.de + i);
  const horsPlage = [...heuresUtiles].filter((h) => h < bornes.de || h > bornes.a).length;

  return (
    <div className="flex flex-col gap-2">
      {(horsPlage > 0 || toutesLesHeures) && (
        <button
          type="button"
          onClick={() => setToutesLesHeures((v) => !v)}
          className="self-start text-label-md text-primary"
        >
          {toutesLesHeures
            ? `Masquer les heures creuses (afficher ${heureDebut} h – ${heureFin} h)`
            : `Afficher les 24 heures — ${horsPlage} heure(s) occupée(s) hors de la plage`}
        </button>
      )}

      <div className="overflow-x-auto">
        <div className="min-w-[860px]">
          {/* En-tête des jours */}
          <div className="grid grid-cols-[56px_repeat(7,1fr)] gap-1">
            <div />
            {jours.map((j) => {
              const aujourdhui = j.toDateString() === new Date().toDateString();
              return (
                <div
                  key={j.toISOString()}
                  className={`px-1 pb-1 text-center ${aujourdhui ? "text-primary" : "text-on-surface-variant"}`}
                >
                  <p className="text-label-md capitalize">
                    {j.toLocaleDateString("fr-FR", { weekday: "short" })}
                  </p>
                  <p className="text-body-sm font-medium">{j.getDate()}</p>
                </div>
              );
            })}
          </div>

          {/* Une ligne par heure */}
          <div className="grid grid-cols-[56px_repeat(7,1fr)] gap-1">
            {heures.map((h) => (
              <FragmentHeure
                key={h}
                heure={h}
                jours={jours}
                cases={cases}
                deplie={deplie}
                setDeplie={setDeplie}
                onCase={onCase}
                onAffectation={onAffectation}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function FragmentHeure({
  heure,
  jours,
  cases,
  deplie,
  setDeplie,
  onCase,
  onAffectation,
}: {
  heure: number;
  jours: Date[];
  cases: Affectation[][][];
  deplie: string | null;
  setDeplie: (v: string | null) => void;
  onCase?: (c: CaseCliquee) => void;
  onAffectation?: (a: Affectation) => void;
}) {
  return (
    <>
      <div className="border-t border-hairline py-1 pr-1 text-right text-label-md text-outline">
        {String(heure).padStart(2, "0")} h
      </div>
      {jours.map((jour, j) => {
        const lignes = cases[j][heure];
        const cle = `${j}-${heure}`;
        const ouvert = deplie === cle;
        const visibles = ouvert ? lignes : lignes.slice(0, MAX_PAR_CASE);
        const reste = lignes.length - visibles.length;

        return (
          <div
            key={cle}
            className="min-h-[38px] border-t border-hairline p-0.5"
            onDoubleClick={() => onCase?.({ jour, heure, affectations: lignes })}
          >
            {lignes.length === 0 ? (
              <button
                type="button"
                onClick={() => onCase?.({ jour, heure, affectations: [] })}
                aria-label={`Affecter le ${jour.toLocaleDateString("fr-FR")} à ${heure} h`}
                className="h-full min-h-[34px] w-full rounded text-label-sm text-transparent transition-colors hover:bg-surface-container-low hover:text-outline"
              >
                +
              </button>
            ) : (
              <div className="flex flex-col gap-0.5">
                {visibles.map((a) => (
                  <button
                    key={a.id}
                    type="button"
                    onClick={() => onAffectation?.(a)}
                    title={`${a.ressource} · ${heureCourte(a.debut)}–${heureCourte(a.fin)}${a.site ? ` · ${a.site}` : ""}`}
                    className={`flex w-full items-center gap-1 rounded px-1 py-0.5 text-left transition-colors ${
                      a.en_chevauchement
                        ? "bg-error-container/50 hover:bg-error-container"
                        : "bg-surface-container-low hover:bg-surface-container"
                    }`}
                  >
                    {a.site_couleur && (
                      <span
                        className="h-2 w-2 flex-none rounded-full"
                        style={{ backgroundColor: a.site_couleur }}
                      />
                    )}
                    {a.en_chevauchement && (
                      <WarningAmberOutlined style={{ fontSize: 11 }} className="flex-none text-error" />
                    )}
                    <span className="truncate text-label-md text-on-surface">{a.ressource}</span>
                  </button>
                ))}
                {reste > 0 && (
                  <button
                    type="button"
                    onClick={() => setDeplie(cle)}
                    className="rounded px-1 py-0.5 text-left text-label-sm text-primary hover:bg-surface-container-low"
                  >
                    +{reste} de plus
                  </button>
                )}
                {ouvert && (
                  <button
                    type="button"
                    onClick={() => setDeplie(null)}
                    className="rounded px-1 text-left text-label-sm text-on-surface-variant"
                  >
                    replier
                  </button>
                )}
              </div>
            )}
          </div>
        );
      })}
    </>
  );
}
