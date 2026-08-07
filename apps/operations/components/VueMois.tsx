"use client";

import { useMemo } from "react";
import { WarningAmberOutlined } from "@mui/icons-material";
import type { Affectation } from "@/lib/operations-api";

/** Le mois : une case par jour, un compte, pas le détail.
 *
 *  Un mois ne tient pas au créneau près — vouloir l'y forcer donnerait des
 *  bandes de deux pixels. La vue mois répond à « quels jours sont chargés »,
 *  et l'on descend au jour pour savoir qui fait quoi. */
export function VueMois({
  mois,
  affectations,
  onJour,
}: {
  mois: Date;
  affectations: Affectation[];
  onJour: (jour: Date) => void;
}) {
  const cases = useMemo(() => {
    const premier = new Date(mois.getFullYear(), mois.getMonth(), 1);
    const decalage = (premier.getDay() + 6) % 7; // la semaine commence lundi
    const debut = new Date(premier);
    debut.setDate(debut.getDate() - decalage);

    return Array.from({ length: 42 }, (_, i) => {
      const jour = new Date(debut.getTime() + i * 86_400_000);
      const duJour = affectations.filter(
        (a) => new Date(a.debut).toDateString() === jour.toDateString(),
      );
      return {
        jour,
        duMois: jour.getMonth() === mois.getMonth(),
        lignes: duJour,
        heures: Math.round(duJour.reduce((s, a) => s + a.heures, 0) * 10) / 10,
        ressources: new Set(duJour.map((a) => a.ressource_id)).size,
        conflits: duJour.filter((a) => a.en_chevauchement).length,
      };
    });
  }, [mois, affectations]);

  const maxHeures = Math.max(1, ...cases.map((c) => c.heures));

  return (
    <div className="overflow-x-auto">
      <div className="min-w-[720px]">
        <div className="mb-1 grid grid-cols-7 gap-1">
          {["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"].map((j) => (
            <p key={j} className="px-1 text-label-md text-on-surface-variant">{j}</p>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {cases.map(({ jour, duMois, lignes, heures, ressources, conflits }) => {
            const aujourdhui = jour.toDateString() === new Date().toDateString();
            return (
              <button
                key={jour.toISOString()}
                type="button"
                onClick={() => onJour(jour)}
                className={`flex min-h-[86px] flex-col items-start gap-1 rounded-lg border p-2 text-left transition-colors ${
                  aujourdhui ? "border-primary" : "border-outline-soft"
                } ${duMois ? "bg-surface-container-lowest hover:bg-surface-container-low" : "bg-surface-container/40 opacity-60"}`}
              >
                <span className={`text-body-sm ${aujourdhui ? "font-semibold text-primary" : "text-on-surface"}`}>
                  {jour.getDate()}
                </span>
                {lignes.length > 0 && (
                  <>
                    <span className="text-label-md text-on-surface-variant">
                      {ressources} ressource{ressources > 1 ? "s" : ""} · {heures} h
                    </span>
                    {/* Une jauge plutôt qu'un nombre seul : elle compare les
                        jours entre eux d'un coup d'œil. */}
                    <span className="mt-auto h-1 w-full overflow-hidden rounded-full bg-track">
                      <span
                        className="block h-full rounded-full bg-primary"
                        style={{ width: `${Math.round((heures / maxHeures) * 100)}%` }}
                      />
                    </span>
                    {conflits > 0 && (
                      <span className="inline-flex items-center gap-1 text-label-sm text-error">
                        <WarningAmberOutlined style={{ fontSize: 12 }} />
                        {conflits}
                      </span>
                    )}
                  </>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
