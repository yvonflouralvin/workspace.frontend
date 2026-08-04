"use client";

import { useMemo, type ReactNode } from "react";
import { PanneauSurvol, useSurvol } from "./PanneauSurvol";

/** Diagramme temporel GÉNÉRIQUE — bandes et repères sur un axe de dates.
 *
 *  Il ne connaît ni phase, ni sprint, ni jalon : il place des intervalles et des
 *  instants. Toute sémantique métier reste chez l'appelant, qui choisit les
 *  libellés, les teintes et le regroupement.
 *
 *  Deux natures d'objets, parce qu'elles ne se lisent pas pareil :
 *  une BANDE occupe une durée, un REPÈRE marque un instant. Dessiner un instant
 *  comme une bande de un jour laisserait croire à une durée.
 */

export interface TimelineBande {
  id: string;
  debut: string;
  fin: string;
  /** Classes de fond/texte — tokens du design system, fournies par l'appelant. */
  tone?: string;
  libelle?: string;
  /** Texte du survol. */
  detail?: string;
  /** Contenu riche du panneau de survol. Prime sur `detail` pour l'AFFICHAGE ;
   *  `detail` reste le nom accessible, que le panneau ne peut pas fournir. */
  apercu?: ReactNode;
}

export interface TimelineRepere {
  id: string;
  date: string;
  libelle: string;
  tone?: string;
  detail?: string;
  apercu?: ReactNode;
}

export interface TimelineLigne {
  id: string;
  libelle: string;
  /** Profondeur d'imbrication : 0 = racine. Décale le libellé, rien d'autre. */
  niveau?: number;
  /** Rendu à droite du libellé (badge de statut, compteur…). */
  suffixe?: ReactNode;
  bandes?: TimelineBande[];
  reperes?: TimelineRepere[];
  /** Ligne de titre sans piste : sépare visuellement des groupes. */
  entete?: boolean;
}

export interface TimelineProps {
  lignes: TimelineLigne[];
  /** Bornes de l'axe. L'appelant les calcule : lui seul sait ce qu'il veut cadrer. */
  debut: string;
  fin: string;
  /** Trait « aujourd'hui ». Omis si la date sort de la fenêtre. */
  aujourdhui?: string;
  /** Finesse de l'axe. C'est le zoom : mois pour la vue d'ensemble, jour pour
   *  regarder une semaine de près. */
  graduation?: Graduation;
  /** Rendu à gauche de l'en-tête — commandes de navigation de l'appelant. */
  commandes?: ReactNode;
  /** Rend bandes et repères cliquables. L'`id` est celui que l'appelant a posé :
   *  lui seul sait à quoi il correspond. */
  onSelectionner?: (id: string) => void;
  /** Largeur de la colonne des libellés. */
  largeurLibelles?: number;
  /** Largeur minimale de la piste : en dessous, elle défile horizontalement. */
  largeurMinPiste?: number;
  vide?: ReactNode;
}

const JOUR = 86_400_000;

function jours(a: number, b: number): number {
  return Math.round((b - a) / JOUR);
}

export type Graduation = "mois" | "semaine" | "jour";

interface Segment {
  cle: string;
  label: string;
  debut: Date;
  fin: Date;
}

/** Découpe l'axe selon l'échelle demandée. Le pas de graduation EST le zoom :
 *  changer d'échelle ne change pas les données, seulement la finesse de lecture. */
function segments(debut: Date, fin: Date, graduation: Graduation): Segment[] {
  const liste: Segment[] = [];
  if (graduation === "mois") {
    const curseur = new Date(debut.getFullYear(), debut.getMonth(), 1);
    while (curseur <= fin) {
      const suivant = new Date(curseur.getFullYear(), curseur.getMonth() + 1, 1);
      liste.push({
        cle: `m-${curseur.getFullYear()}-${curseur.getMonth()}`,
        label: curseur.toLocaleDateString("fr-FR", { month: "short" }),
        debut: new Date(curseur),
        fin: suivant,
      });
      curseur.setMonth(curseur.getMonth() + 1);
    }
    return liste;
  }

  if (graduation === "semaine") {
    // Semaines commençant le lundi — la semaine ISO est ce que lisent les équipes.
    const curseur = new Date(debut);
    curseur.setHours(0, 0, 0, 0);
    curseur.setDate(curseur.getDate() - ((curseur.getDay() + 6) % 7));
    while (curseur <= fin) {
      const suivant = new Date(curseur);
      suivant.setDate(suivant.getDate() + 7);
      liste.push({
        cle: `s-${curseur.toISOString().slice(0, 10)}`,
        label: curseur.toLocaleDateString("fr-FR", { day: "numeric", month: "short" }),
        debut: new Date(curseur),
        fin: suivant,
      });
      curseur.setDate(curseur.getDate() + 7);
    }
    return liste;
  }

  const curseur = new Date(debut);
  curseur.setHours(0, 0, 0, 0);
  while (curseur <= fin) {
    const suivant = new Date(curseur);
    suivant.setDate(suivant.getDate() + 1);
    liste.push({
      cle: `j-${curseur.toISOString().slice(0, 10)}`,
      label: String(curseur.getDate()),
      debut: new Date(curseur),
      fin: suivant,
    });
    curseur.setDate(curseur.getDate() + 1);
  }
  return liste;
}

export function Timeline({
  lignes,
  debut,
  fin,
  aujourdhui,
  largeurLibelles = 240,
  largeurMinPiste = 720,
  graduation = "mois",
  commandes,
  onSelectionner,
  vide,
}: TimelineProps) {
  const survol = useSurvol<ReactNode>();
  const axe = useMemo(() => {
    const t0 = new Date(debut).getTime();
    const t1 = new Date(fin).getTime();
    const duree = Math.max(t1 - t0, JOUR);
    return {
      t0,
      t1,
      duree,
      /** Position en % depuis le début de l'axe, bornée à l'axe. */
      pct: (date: string) => {
        const t = new Date(date).getTime();
        return Math.min(100, Math.max(0, ((t - t0) / duree) * 100));
      },
      segments: segments(new Date(t0), new Date(t1), graduation),
      /** Un objet entièrement hors fenêtre ne se dessine pas : le borner à 0 %
       *  le collerait au bord gauche et ferait croire qu'il commence là. */
      visible: (d: string, f?: string) => {
        const a = new Date(d).getTime();
        const b = f ? new Date(f).getTime() : a;
        return b >= t0 && a <= t1;
      },
    };
  }, [debut, fin, graduation]);

  if (!lignes.length) {
    return <>{vide ?? null}</>;
  }

  const marqueur =
    aujourdhui && new Date(aujourdhui).getTime() >= axe.t0 && new Date(aujourdhui).getTime() <= axe.t1
      ? axe.pct(aujourdhui)
      : null;

  return (
    // Le tableau déborde dans SON conteneur : la page ne défile jamais
    // horizontalement.
    <div className="overflow-x-auto rounded-2xl border border-outline-soft bg-surface-container-lowest">
      <PanneauSurvol position={survol.survole?.position ?? null} {...survol.gestionnairesPanneau}>
        {survol.survole?.cle}
      </PanneauSurvol>
      <div style={{ minWidth: largeurLibelles + largeurMinPiste }}>
        {/* En-tête : les mois */}
        <div className="flex items-stretch border-b border-outline-soft bg-surface-row-alt">
          <div
            className="flex-none flex items-center px-3 py-1.5"
            style={{ width: largeurLibelles }}
          >
            {commandes ?? (
              <span className="text-label-sm uppercase text-outline">Échéancier</span>
            )}
          </div>
          <div className="relative flex-1">
            <div className="flex h-full">
              {axe.segments.map((mois) => {
                const largeur =
                  ((Math.min(mois.fin.getTime(), axe.t1) - Math.max(mois.debut.getTime(), axe.t0)) /
                    axe.duree) *
                  100;
                if (largeur <= 0) return null;
                return (
                  <div
                    key={mois.cle}
                    style={{ width: `${largeur}%` }}
                    className="border-l border-hairline px-1.5 py-2 text-label-sm uppercase text-outline truncate"
                  >
                    {mois.label}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {lignes.map((ligne) => (
          <div
            key={ligne.id}
            className={`flex items-stretch border-b border-hairline last:border-b-0 ${
              ligne.entete ? "bg-surface-container-low" : ""
            }`}
          >
            <div
              className="flex-none flex items-center gap-2 px-4 py-2 min-w-0"
              style={{ width: largeurLibelles, paddingLeft: 16 + (ligne.niveau ?? 0) * 14 }}
            >
              <span
                className={`truncate ${
                  ligne.entete
                    ? "text-body-sm font-semibold text-on-surface"
                    : "text-body-sm text-on-surface-variant"
                }`}
                title={ligne.libelle}
              >
                {ligne.libelle}
              </span>
              {ligne.suffixe}
            </div>

            <div className="relative flex-1 py-2">
              {/* Filets des mois, sous les bandes. */}
              <div className="absolute inset-0 flex" aria-hidden>
                {axe.segments.map((mois) => {
                  const largeur =
                    ((Math.min(mois.fin.getTime(), axe.t1) - Math.max(mois.debut.getTime(), axe.t0)) /
                      axe.duree) *
                    100;
                  if (largeur <= 0) return null;
                  return (
                    <div key={mois.cle} style={{ width: `${largeur}%` }} className="border-l border-hairline" />
                  );
                })}
              </div>

              {marqueur !== null && (
                <div
                  className="absolute top-0 bottom-0 w-px bg-primary/40"
                  style={{ left: `${marqueur}%` }}
                  aria-hidden
                />
              )}

              <div className="relative h-6">
                {(ligne.bandes ?? []).map((bande) => {
                  if (!axe.visible(bande.debut, bande.fin)) return null;
                  const gauche = axe.pct(bande.debut);
                  const largeur = Math.max(axe.pct(bande.fin) - gauche, 0.6);
                  const classes = `absolute top-1 h-4 rounded-md px-1.5 text-label-sm leading-4 truncate text-left ${
                    bande.tone ?? "bg-surface-container text-on-surface-variant"
                  } ${onSelectionner ? "cursor-pointer hover:ring-2 hover:ring-primary/40" : ""}`;
                  const style = { left: `${gauche}%`, width: `${largeur}%` };
                  const contenu = bande.apercu ?? bande.detail ?? bande.libelle;
                  // `title` seulement en secours : deux infobulles à la fois
                  // seraient illisibles.
                  const infobulle = bande.apercu ? undefined : bande.detail ?? bande.libelle;
                  return onSelectionner ? (
                    <button
                      key={bande.id}
                      type="button"
                      title={infobulle}
                      aria-label={bande.detail ?? bande.libelle}
                      style={style}
                      className={classes}
                      onClick={() => onSelectionner(bande.id)}
                      {...survol.gestionnaires(contenu)}
                    >
                      {bande.libelle}
                    </button>
                  ) : (
                    <div
                      key={bande.id}
                      title={infobulle}
                      style={style}
                      className={classes}
                      {...survol.gestionnaires(contenu)}
                    >
                      {bande.libelle}
                    </div>
                  );
                })}

                {(ligne.reperes ?? [])
                  .filter((r) => axe.visible(r.date))
                  .map((repere) => {
                    const style = { left: `${axe.pct(repere.date)}%` };
                    // Un instant n'a pas de durée : losange, jamais une barre.
                    const losange = (
                      <span
                        className={`block w-3 h-3 rotate-45 rounded-[2px] ${repere.tone ?? "bg-outline"}`}
                      />
                    );
                    const contenu = repere.apercu ?? repere.detail ?? repere.libelle;
                    const infobulle = repere.apercu ? undefined : repere.detail ?? repere.libelle;
                    return onSelectionner ? (
                      <button
                        key={repere.id}
                        type="button"
                        title={infobulle}
                        aria-label={repere.detail ?? repere.libelle}
                        style={style}
                        onClick={() => onSelectionner(repere.id)}
                        className="absolute top-1 -translate-x-1/2 cursor-pointer hover:scale-125 transition-transform"
                        {...survol.gestionnaires(contenu)}
                      >
                        {losange}
                      </button>
                    ) : (
                      <div
                        key={repere.id}
                        title={infobulle}
                        style={style}
                        className="absolute top-1 -translate-x-1/2"
                        {...survol.gestionnaires(contenu)}
                      >
                        {losange}
                      </div>
                    );
                  })}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
