"use client";

import { useMemo, useRef, useEffect, type ReactNode } from "react";
import { PanneauSurvol, useSurvol } from "./PanneauSurvol";

/** Grille horaire GÉNÉRIQUE — des jours en colonnes, des heures en lignes.
 *
 *  Troisième primitive du trio : `Timeline` répond à « comment ça s'enchaîne »,
 *  `CalendrierMois` à « qu'est-ce qui tombe ce jour-là », celle-ci à « à quelle
 *  heure, et qu'est-ce qui se chevauche ». Aucune ne connaît de sémantique
 *  métier : on leur passe des barres et des libellés.
 *
 *  Ce qui dure toute la journée ne descend PAS dans la grille : une barre de
 *  vingt-quatre heures écraserait tout le reste. Ces entrées vont dans un
 *  bandeau, en haut, comme dans n'importe quel agenda.
 */

export interface CreneauHoraire {
  id: string;
  /** ISO. Un créneau sans `fin` dure une demi-heure à l'affichage. */
  debut: string;
  fin?: string;
  libelle: string;
  tone?: string;
  /** Sort de la grille et se pose dans le bandeau du haut. */
  journeeEntiere?: boolean;
  detail?: string;
  apercu?: ReactNode;
}

export interface GrilleHoraireProps {
  /** Jours affichés, dans l'ordre — un seul pour la vue « jour ». */
  jours: string[];
  creneaux: CreneauHoraire[];
  /** Bornes de la grille. Par défaut 7 h → 21 h : afficher les nuits vides
   *  gaspille les deux tiers de la hauteur. */
  heureDebut?: number;
  heureFin?: number;
  aujourdhui?: string;
  onSelectionner?: (id: string) => void;
}

const HAUTEUR_HEURE = 48;
const JOUR_MS = 86_400_000;

function minuit(d: Date): Date {
  const c = new Date(d);
  c.setHours(0, 0, 0, 0);
  return c;
}

interface Place {
  creneau: CreneauHoraire;
  haut: number;
  hauteur: number;
  colonne: number;
  colonnes: number;
}

/** Répartit les créneaux qui se chevauchent en colonnes côte à côte.
 *
 *  Le regroupement se fait par GRAPPE de chevauchement, pas deux à deux : trois
 *  réunions qui se recouvrent en chaîne doivent toutes rétrécir, sinon la
 *  troisième recouvrirait la première. */
function repartir(places: Place[]): Place[] {
  const tries = [...places].sort((a, b) => a.haut - b.haut || a.hauteur - b.hauteur);
  const sortie: Place[] = [];
  let grappe: Place[] = [];
  let finGrappe = -1;

  const fermer = () => {
    if (!grappe.length) return;
    const colonnes: Place[][] = [];
    for (const place of grappe) {
      let index = colonnes.findIndex(
        (col) => col[col.length - 1]!.haut + col[col.length - 1]!.hauteur <= place.haut
      );
      if (index === -1) {
        colonnes.push([place]);
        index = colonnes.length - 1;
      } else {
        colonnes[index]!.push(place);
      }
      place.colonne = index;
    }
    for (const place of grappe) place.colonnes = colonnes.length;
    sortie.push(...grappe);
    grappe = [];
    finGrappe = -1;
  };

  for (const place of tries) {
    if (grappe.length && place.haut >= finGrappe) fermer();
    grappe.push(place);
    finGrappe = Math.max(finGrappe, place.haut + place.hauteur);
  }
  fermer();
  return sortie;
}

export function GrilleHoraire({
  jours,
  creneaux,
  heureDebut = 7,
  heureFin = 21,
  aujourdhui,
  onSelectionner,
}: GrilleHoraireProps) {
  const survol = useSurvol<ReactNode>();
  const corps = useRef<HTMLDivElement>(null);
  const heures = Math.max(1, heureFin - heureDebut);

  // On se cale sur la première heure utile plutôt qu'en haut de grille : sans
  // ça, une journée qui commence à 14 h s'ouvre sur du vide.
  useEffect(() => {
    if (!corps.current) return;
    const premiere = creneaux
      .filter((c) => !c.journeeEntiere)
      .map((c) => new Date(c.debut).getHours())
      .sort((a, b) => a - b)[0];
    if (premiere == null) return;
    corps.current.scrollTop = Math.max(0, (premiere - heureDebut - 1) * HAUTEUR_HEURE);
  }, [creneaux, heureDebut]);

  const parJour = useMemo(() => {
    const carte = new Map<string, { pleines: CreneauHoraire[]; places: Place[] }>();
    for (const jour of jours) {
      const debutJour = minuit(new Date(jour));
      const finJour = new Date(debutJour.getTime() + JOUR_MS);
      const pleines: CreneauHoraire[] = [];
      const places: Place[] = [];

      for (const creneau of creneaux) {
        const debut = new Date(creneau.debut);
        const fin = creneau.fin ? new Date(creneau.fin) : new Date(debut.getTime() + 1800_000);
        if (fin <= debutJour || debut >= finJour) continue;
        if (creneau.journeeEntiere) {
          pleines.push(creneau);
          continue;
        }
        // Bornage au jour : une réunion à cheval sur minuit se dessine des deux
        // côtés, chacun tronqué à sa journée.
        const de = Math.max(debut.getTime(), debutJour.getTime());
        const a = Math.min(fin.getTime(), finJour.getTime());
        const minutesDe = (de - debutJour.getTime()) / 60000;
        const minutesA = (a - debutJour.getTime()) / 60000;
        const haut = ((minutesDe - heureDebut * 60) / 60) * HAUTEUR_HEURE;
        const hauteur = Math.max(18, ((minutesA - minutesDe) / 60) * HAUTEUR_HEURE);
        places.push({ creneau, haut, hauteur, colonne: 0, colonnes: 1 });
      }
      carte.set(jour, { pleines, places: repartir(places) });
    }
    return carte;
  }, [jours, creneaux, heureDebut]);

  const libelleJour = (jour: string) =>
    new Date(jour).toLocaleDateString("fr-FR", {
      weekday: "short",
      day: "numeric",
      month: jours.length > 1 ? undefined : "long",
    });

  const aUnBandeau = jours.some((j) => (parJour.get(j)?.pleines.length ?? 0) > 0);

  return (
    <div className="rounded-2xl border border-outline-soft bg-surface-container-lowest overflow-hidden">
      <div
        className="grid border-b border-outline-soft bg-surface-row-alt"
        style={{ gridTemplateColumns: `56px repeat(${jours.length}, minmax(0, 1fr))` }}
      >
        <span />
        {jours.map((jour) => {
          const ceJour = aujourdhui && minuit(new Date(jour)).getTime() === minuit(new Date(aujourdhui)).getTime();
          return (
            <span
              key={jour}
              className={`px-2 py-2 text-center text-label-md font-semibold border-l border-outline-soft ${
                ceJour ? "text-primary" : "text-on-surface-variant"
              }`}
            >
              {libelleJour(jour)}
            </span>
          );
        })}
      </div>

      {aUnBandeau && (
        <div
          className="grid border-b border-outline-soft"
          style={{ gridTemplateColumns: `56px repeat(${jours.length}, minmax(0, 1fr))` }}
        >
          <span className="px-2 py-1 text-right text-label-sm uppercase text-outline">jour</span>
          {jours.map((jour) => (
            <div key={jour} className="border-l border-outline-soft p-1 space-y-1">
              {parJour.get(jour)?.pleines.map((creneau) => (
                <button
                  key={`${jour}-${creneau.id}`}
                  type="button"
                  onClick={() => onSelectionner?.(creneau.id)}
                  aria-label={creneau.detail ?? creneau.libelle}
                  {...survol.gestionnaires(creneau.apercu ?? creneau.detail ?? creneau.libelle)}
                  className={`block w-full truncate rounded-md px-1.5 py-0.5 text-left text-label-md ${
                    creneau.tone ?? "bg-surface-container text-on-surface-variant"
                  }`}
                >
                  {creneau.libelle}
                </button>
              ))}
            </div>
          ))}
        </div>
      )}

      <div ref={corps} className="max-h-[62vh] overflow-y-auto">
        <div
          className="grid"
          style={{ gridTemplateColumns: `56px repeat(${jours.length}, minmax(0, 1fr))` }}
        >
          <div>
            {Array.from({ length: heures }, (_, i) => (
              <div
                key={i}
                style={{ height: HAUTEUR_HEURE }}
                className="relative border-b border-hairline-soft"
              >
                <span className="absolute -top-2 right-1.5 text-label-sm tabular-nums text-outline">
                  {String(heureDebut + i).padStart(2, "0")}:00
                </span>
              </div>
            ))}
          </div>

          {jours.map((jour) => (
            <div key={jour} className="relative border-l border-outline-soft">
              {Array.from({ length: heures }, (_, i) => (
                <div key={i} style={{ height: HAUTEUR_HEURE }} className="border-b border-hairline-soft" />
              ))}
              {parJour.get(jour)?.places.map((place) => (
                <button
                  key={`${jour}-${place.creneau.id}`}
                  type="button"
                  onClick={() => onSelectionner?.(place.creneau.id)}
                  aria-label={place.creneau.detail ?? place.creneau.libelle}
                  {...survol.gestionnaires(
                    place.creneau.apercu ?? place.creneau.detail ?? place.creneau.libelle
                  )}
                  style={{
                    top: place.haut,
                    height: place.hauteur,
                    left: `calc(${(place.colonne / place.colonnes) * 100}% + 2px)`,
                    width: `calc(${100 / place.colonnes}% - 4px)`,
                  }}
                  className={`absolute overflow-hidden rounded-lg px-1.5 py-0.5 text-left text-label-md shadow-card ${
                    place.creneau.tone ?? "bg-primary/15 text-primary"
                  }`}
                >
                  <span className="block truncate font-semibold">{place.creneau.libelle}</span>
                  {place.hauteur > 34 && (
                    <span className="block truncate opacity-80">
                      {new Date(place.creneau.debut).toLocaleTimeString("fr-FR", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  )}
                </button>
              ))}
            </div>
          ))}
        </div>
      </div>

      <PanneauSurvol position={survol.survole?.position ?? null} {...survol.gestionnairesPanneau}>
        {survol.survole?.cle}
      </PanneauSurvol>
    </div>
  );
}
