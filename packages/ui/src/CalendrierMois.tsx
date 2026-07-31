"use client";

import { useMemo, type ReactNode } from "react";
import { PanneauSurvol, useSurvol } from "./PanneauSurvol";

/** Calendrier mensuel GÉNÉRIQUE — grille de semaines, événements posés dessus.
 *
 *  Complémentaire de `Timeline` : la frise répond à « comment ça s'enchaîne »,
 *  le calendrier à « qu'est-ce qui tombe ce jour-là ». Ni l'un ni l'autre ne
 *  connaît de sémantique métier.
 *
 *  Les événements qui DURENT sont découpés par semaine et empilés en couloirs,
 *  comme dans un agenda : une barre qui traverse cinq jours se lit d'un coup,
 *  là où cinq pastilles isolées ne diraient rien de la continuité.
 */

export interface EvenementCalendrier {
  id: string;
  /** Jour unique si `fin` est absent. */
  debut: string;
  fin?: string;
  libelle: string;
  tone?: string;
  detail?: string;
  /** Contenu riche du panneau de survol. Prime sur `detail` pour l'AFFICHAGE ;
   *  `detail` reste le nom accessible, que le panneau ne peut pas fournir. */
  apercu?: ReactNode;
  /** Un instant se dessine en pastille, jamais en barre. */
  instant?: boolean;
}

export interface CalendrierMoisProps {
  /** N'importe quelle date du mois à afficher. */
  mois: string;
  evenements: EvenementCalendrier[];
  aujourdhui?: string;
  /** Couloirs affichés par semaine avant repli « +n ». */
  couloirsMax?: number;
  /** Rend les événements cliquables. L'`id` est celui posé par l'appelant. */
  onSelectionner?: (id: string) => void;
  vide?: ReactNode;
}

const JOUR = 86_400_000;
const NOMS = ["lun.", "mar.", "mer.", "jeu.", "ven.", "sam.", "dim."];

function minuit(d: Date): Date {
  const c = new Date(d);
  c.setHours(0, 0, 0, 0);
  return c;
}

/** Lundi de la semaine contenant `d`. */
function lundi(d: Date): Date {
  const c = minuit(d);
  c.setDate(c.getDate() - ((c.getDay() + 6) % 7));
  return c;
}

interface Placement {
  evenement: EvenementCalendrier;
  colonne: number;
  largeur: number;
  couloir: number;
  debordeAvant: boolean;
  debordeApres: boolean;
}

/** Empilement glouton : le premier couloir libre, jamais deux barres qui se
 *  chevauchent sur la même ligne. */
function placer(evenements: EvenementCalendrier[], debutSemaine: Date): Placement[] {
  const finSemaine = new Date(debutSemaine.getTime() + 7 * JOUR);
  const occupes: number[][] = [];
  const placements: Placement[] = [];

  const concernes = evenements
    .map((e) => {
      const d = minuit(new Date(e.debut));
      const f = e.fin ? minuit(new Date(e.fin)) : d;
      return { e, d, f };
    })
    .filter(({ d, f }) => f >= debutSemaine && d < finSemaine)
    .sort((a, b) => a.d.getTime() - b.d.getTime() || b.f.getTime() - a.f.getTime());

  for (const { e, d, f } of concernes) {
    const colonne = Math.max(0, Math.round((d.getTime() - debutSemaine.getTime()) / JOUR));
    const derniere = Math.min(6, Math.round((f.getTime() - debutSemaine.getTime()) / JOUR));
    const largeur = Math.max(1, derniere - colonne + 1);

    let couloir = 0;
    while (
      occupes[couloir] &&
      occupes[couloir]!.some((c) => c >= colonne && c < colonne + largeur)
    ) {
      couloir += 1;
    }
    occupes[couloir] = [
      ...(occupes[couloir] ?? []),
      ...Array.from({ length: largeur }, (_, i) => colonne + i),
    ];
    placements.push({
      evenement: e,
      colonne,
      largeur,
      couloir,
      debordeAvant: d < debutSemaine,
      debordeApres: f >= finSemaine,
    });
  }
  return placements;
}

export function CalendrierMois({
  mois,
  evenements,
  aujourdhui,
  couloirsMax = 4,
  onSelectionner,
  vide,
}: CalendrierMoisProps) {
  const survol = useSurvol<ReactNode>();
  const semaines = useMemo(() => {
    const reference = new Date(mois);
    const premier = new Date(reference.getFullYear(), reference.getMonth(), 1);
    const dernier = new Date(reference.getFullYear(), reference.getMonth() + 1, 0);
    const debut = lundi(premier);
    const liste: Date[] = [];
    const curseur = new Date(debut);
    while (curseur <= dernier) {
      liste.push(new Date(curseur));
      curseur.setDate(curseur.getDate() + 7);
    }
    return { liste, moisAffiche: reference.getMonth() };
  }, [mois]);

  if (!evenements.length && vide) {
    return <>{vide}</>;
  }

  const jourCourant = aujourdhui ? minuit(new Date(aujourdhui)).getTime() : null;

  return (
    <div className="rounded-2xl border border-outline-soft bg-surface-container-lowest overflow-hidden">
      <PanneauSurvol position={survol.survole?.position ?? null} {...survol.gestionnairesPanneau}>
        {survol.survole?.cle}
      </PanneauSurvol>
      <div className="grid grid-cols-7 bg-surface-row-alt border-b border-outline-soft">
        {NOMS.map((nom) => (
          <div key={nom} className="px-2 py-2 text-label-sm uppercase text-outline">
            {nom}
          </div>
        ))}
      </div>

      {semaines.liste.map((debutSemaine) => {
        const placements = placer(evenements, debutSemaine);
        const couloirs = placements.length
          ? Math.max(...placements.map((p) => p.couloir)) + 1
          : 0;
        const visibles = placements.filter((p) => p.couloir < couloirsMax);
        const caches = placements.filter((p) => p.couloir >= couloirsMax);

        return (
          <div key={debutSemaine.toISOString()} className="border-b border-hairline last:border-b-0">
            <div className="relative">
              {/* Les cases du jour, sous les barres. */}
              <div className="grid grid-cols-7">
                {Array.from({ length: 7 }, (_, i) => {
                  const jour = new Date(debutSemaine.getTime() + i * JOUR);
                  const horsMois = jour.getMonth() !== semaines.moisAffiche;
                  const estAujourdhui = jourCourant === minuit(jour).getTime();
                  return (
                    <div
                      key={i}
                      className={`min-h-[104px] border-l border-hairline first:border-l-0 px-2 pt-1.5 ${
                        horsMois ? "bg-surface-container-low/40" : ""
                      }`}
                    >
                      <span
                        className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-label-md ${
                          estAujourdhui
                            ? "bg-primary text-on-primary font-semibold"
                            : horsMois
                              ? "text-outline-variant"
                              : "text-on-surface-variant"
                        }`}
                      >
                        {jour.getDate()}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Les barres, en couloirs, par-dessus la grille. */}
              <div className="absolute left-0 right-0 top-9 pointer-events-none">
                {visibles.map((p) => (
                  <div
                    key={p.evenement.id}
                    className="absolute px-1 pointer-events-auto"
                    style={{
                      left: `${(p.colonne / 7) * 100}%`,
                      width: `${(p.largeur / 7) * 100}%`,
                      top: p.couloir * 22,
                    }}
                  >
                    <button
                      type="button"
                      disabled={!onSelectionner}
                      onClick={() => onSelectionner?.(p.evenement.id)}
                      title={p.evenement.apercu ? undefined : p.evenement.detail ?? p.evenement.libelle}
                      aria-label={p.evenement.detail ?? p.evenement.libelle}
                      {...survol.gestionnaires(
                        p.evenement.apercu ?? p.evenement.detail ?? p.evenement.libelle
                      )}
                      className={`block w-full h-[18px] leading-[18px] text-label-sm truncate px-1.5 text-left ${
                        onSelectionner ? "cursor-pointer hover:ring-2 hover:ring-primary/40" : ""
                      } ${
                        p.evenement.instant ? "rounded-full" : "rounded-md"
                      } ${p.debordeAvant ? "rounded-l-none" : ""} ${
                        p.debordeApres ? "rounded-r-none" : ""
                      } ${p.evenement.tone ?? "bg-surface-container text-on-surface-variant"}`}
                    >
                      {p.debordeAvant && "◂ "}
                      {p.evenement.libelle}
                      {p.debordeApres && " ▸"}
                    </button>
                  </div>
                ))}
              </div>

              {caches.length > 0 && (
                <div
                  className="absolute left-0 right-0 px-2 pointer-events-none"
                  style={{ top: 36 + couloirsMax * 22 }}
                >
                  <span className="text-label-md text-outline">
                    +{caches.length} autre{caches.length > 1 ? "s" : ""} cette semaine
                  </span>
                </div>
              )}

              {/* Réserve la hauteur des couloirs sous la grille. */}
              <div style={{ height: Math.min(couloirs, couloirsMax) * 22 + (caches.length ? 20 : 6) }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}
