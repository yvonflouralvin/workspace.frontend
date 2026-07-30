"use client";

import { useMemo, type ReactNode } from "react";

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
}

export interface TimelineRepere {
  id: string;
  date: string;
  libelle: string;
  tone?: string;
  detail?: string;
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
  /** Trait « aujourd'hui ». Omis si la date sort de l'axe. */
  aujourdhui?: string;
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

function moisEntre(debut: Date, fin: Date): { cle: string; label: string; debut: Date; fin: Date }[] {
  const bornes: { cle: string; label: string; debut: Date; fin: Date }[] = [];
  const curseur = new Date(debut.getFullYear(), debut.getMonth(), 1);
  while (curseur <= fin) {
    const suivant = new Date(curseur.getFullYear(), curseur.getMonth() + 1, 1);
    bornes.push({
      cle: `${curseur.getFullYear()}-${curseur.getMonth()}`,
      label: curseur.toLocaleDateString("fr-FR", { month: "short" }),
      debut: new Date(curseur),
      fin: suivant,
    });
    curseur.setMonth(curseur.getMonth() + 1);
  }
  return bornes;
}

export function Timeline({
  lignes,
  debut,
  fin,
  aujourdhui,
  largeurLibelles = 240,
  largeurMinPiste = 720,
  vide,
}: TimelineProps) {
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
      mois: moisEntre(new Date(t0), new Date(t1)),
    };
  }, [debut, fin]);

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
      <div style={{ minWidth: largeurLibelles + largeurMinPiste }}>
        {/* En-tête : les mois */}
        <div className="flex items-stretch border-b border-outline-soft bg-surface-row-alt">
          <div
            className="flex-none px-4 py-2 text-label-sm uppercase text-outline"
            style={{ width: largeurLibelles }}
          >
            Échéancier
          </div>
          <div className="relative flex-1">
            <div className="flex h-full">
              {axe.mois.map((mois) => {
                const largeur =
                  ((Math.min(mois.fin.getTime(), axe.t1) - Math.max(mois.debut.getTime(), axe.t0)) /
                    axe.duree) *
                  100;
                if (largeur <= 0) return null;
                return (
                  <div
                    key={mois.cle}
                    style={{ width: `${largeur}%` }}
                    className="border-l border-hairline px-2 py-2 text-label-sm uppercase text-outline truncate"
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
                {axe.mois.map((mois) => {
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
                  const gauche = axe.pct(bande.debut);
                  const largeur = Math.max(axe.pct(bande.fin) - gauche, 0.6);
                  return (
                    <div
                      key={bande.id}
                      title={bande.detail ?? bande.libelle}
                      style={{ left: `${gauche}%`, width: `${largeur}%` }}
                      className={`absolute top-1 h-4 rounded-md px-1.5 text-label-sm leading-4 truncate ${
                        bande.tone ?? "bg-surface-container text-on-surface-variant"
                      }`}
                    >
                      {bande.libelle}
                    </div>
                  );
                })}

                {(ligne.reperes ?? []).map((repere) => (
                  <div
                    key={repere.id}
                    title={repere.detail ?? repere.libelle}
                    style={{ left: `${axe.pct(repere.date)}%` }}
                    className="absolute top-1 -translate-x-1/2"
                  >
                    {/* Un instant n'a pas de durée : losange, jamais une barre. */}
                    <span
                      className={`block w-3 h-3 rotate-45 rounded-[2px] ${
                        repere.tone ?? "bg-outline"
                      }`}
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
