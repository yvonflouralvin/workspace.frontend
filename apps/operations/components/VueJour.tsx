"use client";

import { useMemo } from "react";
import { WarningAmberOutlined } from "@mui/icons-material";
import { heureCourte, type Affectation } from "@/lib/operations-api";
import { borner } from "@/components/VueSemaine";

const LARGEUR_LIBELLE = 160;
const HAUTEUR_VOIE = 26;
const MINUTES_JOUR = 1440;

interface Barre {
  a: Affectation;
  gauche: number;
  largeur: number;
  depuisLaVeille: boolean;
  versLeLendemain: boolean;
}

/** Le jour : une ressource par ligne, les 24 heures en colonnes, et un trait
 *  posé sur les tranches réellement occupées.
 *
 *  C'est la seule vue où la durée se lit d'un coup d'œil : un trait qui court de
 *  8 h à 16 h dit la même chose qu'une liste, mais il dit aussi qu'il ne reste
 *  rien avant, et où sont les trous. */
export function VueJour({
  jour,
  affectations,
  onCase,
  onAffectation,
}: {
  jour: Date;
  affectations: Affectation[];
  onCase?: (jour: Date, heure: number) => void;
  onAffectation?: (a: Affectation) => void;
}) {
  const lignes = useMemo(() => {
    const debutJour = new Date(jour);
    debutJour.setHours(0, 0, 0, 0);
    const finJour = new Date(debutJour.getTime() + 86_400_000);

    const par = new Map<number, { nom: string; barres: Barre[] }>();
    for (const a of affectations) {
      if (new Date(a.debut) >= finJour || new Date(a.fin) <= debutJour) continue;
      const b = borner(a, debutJour, finJour);
      const depuis = (b.debut.getTime() - debutJour.getTime()) / 60_000;
      const duree = Math.max(15, (b.fin.getTime() - b.debut.getTime()) / 60_000);
      const entree = par.get(a.ressource_id) ?? { nom: a.ressource ?? "—", barres: [] };
      entree.barres.push({
        a,
        gauche: (depuis / MINUTES_JOUR) * 100,
        largeur: (duree / MINUTES_JOUR) * 100,
        depuisLaVeille: b.depuisLaVeille,
        versLeLendemain: b.versLeLendemain,
      });
      par.set(a.ressource_id, entree);
    }

    return [...par.values()]
      .map((l) => ({ nom: l.nom, voies: repartirEnVoies(l.barres) }))
      .sort((x, y) => x.nom.localeCompare(y.nom, "fr"));
  }, [jour, affectations]);

  const heures = Array.from({ length: 24 }, (_, h) => h);

  if (lignes.length === 0) {
    return (
      <div className="rounded-2xl border border-outline-variant p-10 text-center">
        <p className="text-body-sm text-on-surface-variant">
          Aucune ressource affectée le {jour.toLocaleDateString("fr-FR")}.
        </p>
        {onCase && (
          <button
            type="button"
            onClick={() => onCase(jour, 8)}
            className="mt-2 text-label-md text-primary"
          >
            Affecter une ressource
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-2xl border border-outline-variant">
      <div style={{ minWidth: LARGEUR_LIBELLE + 24 * 38 }}>
        {/* Règle des heures */}
        <div className="flex border-b border-outline-variant bg-surface-container-low">
          <div className="flex-none" style={{ width: LARGEUR_LIBELLE }} />
          <div className="grid flex-1" style={{ gridTemplateColumns: "repeat(24, minmax(0, 1fr))" }}>
            {heures.map((h) => (
              <div
                key={h}
                className={`border-l border-outline-variant py-1 text-center text-label-sm ${
                  h >= 8 && h < 18 ? "text-on-surface-variant" : "text-outline"
                }`}
              >
                {String(h).padStart(2, "0")}
              </div>
            ))}
          </div>
        </div>

        {lignes.map(({ nom, voies }) => (
          <div key={nom} className="flex border-t border-outline-soft">
            <div
              className="flex flex-none items-center border-r border-outline-variant px-2 py-1.5"
              style={{ width: LARGEUR_LIBELLE }}
            >
              <span className="truncate text-body-sm font-medium text-on-surface" title={nom}>
                {nom}
              </span>
            </div>

            <div
              className="relative flex-1"
              style={{ height: voies.length * HAUTEUR_VOIE + 8 }}
            >
              {/* Colonnes de fond : elles servent de repère ET de cible de clic
                  pour affecter directement sur une tranche horaire. */}
              <div
                className="absolute inset-0 grid"
                style={{ gridTemplateColumns: "repeat(24, minmax(0, 1fr))" }}
              >
                {heures.map((h) => (
                  <button
                    key={h}
                    type="button"
                    disabled={!onCase}
                    onClick={() => onCase?.(jour, h)}
                    aria-label={`Affecter à ${h} h`}
                    className={`border-l border-hairline transition-colors disabled:cursor-default ${
                      h >= 8 && h < 18 ? "" : "bg-surface-container-low/50"
                    } ${onCase ? "hover:bg-surface-container" : ""}`}
                  />
                ))}
              </div>

              {voies.map((voie, v) =>
                voie.map((b) => (
                  <button
                    key={b.a.id}
                    type="button"
                    onClick={() => onAffectation?.(b.a)}
                    title={`${b.a.ressource} · ${heureCourte(b.a.debut)}–${heureCourte(b.a.fin)}${b.a.site ? ` · ${b.a.site}` : ""}`}
                    className={`absolute flex items-center gap-1 overflow-hidden rounded-md px-1.5 text-left transition-colors ${
                      b.a.en_chevauchement
                        ? "bg-error-container hover:brightness-95"
                        : "bg-primary/85 hover:bg-primary"
                    } ${b.depuisLaVeille ? "rounded-l-none" : ""} ${b.versLeLendemain ? "rounded-r-none" : ""}`}
                    style={{
                      left: `${b.gauche}%`,
                      width: `${b.largeur}%`,
                      top: v * HAUTEUR_VOIE + 4,
                      height: HAUTEUR_VOIE - 4,
                    }}
                  >
                    {b.a.en_chevauchement && (
                      <WarningAmberOutlined style={{ fontSize: 12 }} className="flex-none text-error" />
                    )}
                    {b.a.site_couleur && !b.a.en_chevauchement && (
                      <span
                        className="h-2 w-2 flex-none rounded-full ring-1 ring-white/60"
                        style={{ backgroundColor: b.a.site_couleur }}
                      />
                    )}
                    <span
                      className={`truncate text-label-sm ${
                        b.a.en_chevauchement ? "text-error" : "text-on-primary"
                      }`}
                    >
                      {heureCourte(b.a.debut)}–{heureCourte(b.a.fin)}
                      {b.a.site ? ` · ${b.a.site}` : ""}
                    </span>
                  </button>
                )),
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Deux créneaux de la MÊME ressource peuvent se chevaucher — c'est même la
 *  situation que ce module sert à repérer. Les empiler sur une seule voie en
 *  cacherait un : on ouvre une voie de plus dès qu'ils se marchent dessus. */
function repartirEnVoies(barres: Barre[]): Barre[][] {
  const voies: Barre[][] = [];
  for (const b of [...barres].sort((x, y) => x.gauche - y.gauche)) {
    const libre = voies.find((voie) => {
      const derniere = voie[voie.length - 1];
      return derniere.gauche + derniere.largeur <= b.gauche + 0.0001;
    });
    if (libre) libre.push(b);
    else voies.push([b]);
  }
  return voies;
}
