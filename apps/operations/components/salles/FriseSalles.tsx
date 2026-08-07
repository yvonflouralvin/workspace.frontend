"use client";

import { useMemo } from "react";
import { WarningAmberOutlined } from "@mui/icons-material";
import { heureCourte, type Reservation, type Salle } from "@/lib/operations-api";

const LARGEUR_LIBELLE = 170;
const HAUTEUR_VOIE = 36;
const HAUTEUR_BARRE = 28;
const MINUTES_JOUR = 1440;

interface Barre {
  r: Reservation;
  gauche: number;
  largeur: number;
  depuisLaVeille: boolean;
  versLeLendemain: boolean;
}

/** Le jour : une salle par ligne, les 24 heures en colonnes.
 *
 *  Toutes les salles sont montrées, même vides — la question d'une journée est
 *  « qu'est-ce qui est LIBRE à 14 h ? », et une salle absente de l'écran parce
 *  qu'elle n'a rien ne répond pas à cette question-là.
 */
export function FriseSalles({
  jour,
  salles,
  reservations,
  peutDemander,
  onCase,
  onReservation,
}: {
  jour: Date;
  salles: Salle[];
  reservations: Reservation[];
  peutDemander: boolean;
  onCase?: (salle: Salle, jour: Date, heure: number) => void;
  onReservation?: (r: Reservation) => void;
}) {
  const lignes = useMemo(() => {
    const debutJour = new Date(jour);
    debutJour.setHours(0, 0, 0, 0);
    const finJour = new Date(debutJour.getTime() + 86_400_000);

    const par = new Map<number, Barre[]>();
    for (const r of reservations) {
      // Une réservation refusée n'occupe rien : la dessiner ferait paraître la
      // salle prise sur un créneau qu'on vient justement de rendre.
      if (r.statut === "REFUSEE") continue;
      const debut = new Date(r.debut);
      const fin = new Date(r.fin);
      if (debut >= finJour || fin <= debutJour) continue;
      const de = debut < debutJour ? debutJour : debut;
      const a = fin > finJour ? finJour : fin;
      const depuis = (de.getTime() - debutJour.getTime()) / 60_000;
      const duree = Math.max(15, (a.getTime() - de.getTime()) / 60_000);
      const liste = par.get(r.salle_id) ?? [];
      liste.push({
        r,
        gauche: (depuis / MINUTES_JOUR) * 100,
        largeur: (duree / MINUTES_JOUR) * 100,
        depuisLaVeille: debut < debutJour,
        versLeLendemain: fin > finJour,
      });
      par.set(r.salle_id, liste);
    }

    return salles.map((s) => ({ salle: s, voies: repartirEnVoies(par.get(s.id) ?? []) }));
  }, [jour, salles, reservations]);

  const heures = Array.from({ length: 24 }, (_, h) => h);

  return (
    <div className="overflow-x-auto rounded-2xl border border-outline-variant">
      <div style={{ minWidth: LARGEUR_LIBELLE + 24 * 38 }}>
        <div className="flex border-b border-outline-variant bg-surface-container-low">
          <div className="flex-none" style={{ width: LARGEUR_LIBELLE }} />
          <div className="grid flex-1" style={{ gridTemplateColumns: "repeat(24, minmax(0, 1fr))" }}>
            {heures.map((h) => (
              <div
                key={h}
                className={`border-l border-outline-variant py-1 text-center text-label-sm tabular-nums ${
                  h >= 8 && h < 18 ? "text-on-surface-variant" : "text-outline"
                }`}
              >
                {String(h).padStart(2, "0")}
              </div>
            ))}
          </div>
        </div>

        {lignes.map(({ salle, voies }) => (
          <div key={salle.id} className="flex border-t border-outline-soft">
            <div
              className={`flex flex-none flex-col justify-center border-r border-outline-variant px-2 py-1.5 ${
                salle.active ? "" : "opacity-60"
              }`}
              style={{ width: LARGEUR_LIBELLE }}
            >
              <span className="truncate text-body-sm font-medium text-on-surface" title={salle.libelle}>
                {salle.libelle}
              </span>
              <span className="text-label-sm text-outline">
                {salle.capacite ? `${salle.capacite} places` : "—"}
                {!salle.active && " · hors service"}
              </span>
            </div>

            <div
              className="relative flex-1"
              style={{ height: Math.max(voies.length, 1) * HAUTEUR_VOIE + 6 }}
            >
              <div
                className="absolute inset-0 grid"
                style={{ gridTemplateColumns: "repeat(24, minmax(0, 1fr))" }}
              >
                {heures.map((h) => (
                  <button
                    key={h}
                    type="button"
                    disabled={!peutDemander || !salle.active}
                    onClick={() => onCase?.(salle, jour, h)}
                    aria-label={`Réserver ${salle.libelle} à ${h} h`}
                    className={`border-l border-hairline transition-colors disabled:cursor-default ${
                      h >= 8 && h < 18 ? "" : "bg-surface-container-low/50"
                    } ${peutDemander && salle.active ? "hover:bg-surface-container" : ""}`}
                  />
                ))}
              </div>

              {voies.map((voie, v) =>
                voie.map((b) => {
                  const enAttente = b.r.statut === "DEMANDEE";
                  return (
                    <button
                      key={b.r.id}
                      type="button"
                      onClick={() => onReservation?.(b.r)}
                      title={`${b.r.salle} · ${heureCourte(b.r.debut)}–${heureCourte(b.r.fin)}${b.r.objet ? ` · ${b.r.objet}` : ""}${b.r.demandeur ? ` · ${b.r.demandeur}` : ""}`}
                      className={`absolute flex items-center gap-1.5 overflow-hidden rounded-lg px-2 text-left shadow-card ring-1 transition-colors ${
                        b.r.en_chevauchement
                          ? "bg-error-container text-error ring-error/40"
                          : enAttente
                            // En attente : contour tramé, fond très clair. Une
                            // demande ne bloque personne — la peindre comme une
                            // réservation acceptée ferait croire l'inverse.
                            ? "border border-dashed border-outline bg-surface-container-low text-on-surface-variant ring-transparent"
                            : "bg-secondary/20 text-secondary ring-secondary/40"
                      } ${b.depuisLaVeille ? "rounded-l-none" : ""} ${b.versLeLendemain ? "rounded-r-none" : ""}`}
                      style={{
                        left: `${b.gauche}%`,
                        width: `${b.largeur}%`,
                        top: v * HAUTEUR_VOIE + (HAUTEUR_VOIE - HAUTEUR_BARRE) / 2 + 3,
                        height: HAUTEUR_BARRE,
                      }}
                    >
                      {b.r.en_chevauchement && (
                        <WarningAmberOutlined style={{ fontSize: 13 }} className="flex-none" />
                      )}
                      <span className="truncate text-label-md font-semibold tabular-nums">
                        {heureCourte(b.r.debut)}–{heureCourte(b.r.fin)}
                      </span>
                      <span className="truncate text-label-sm opacity-75">
                        {b.r.objet ?? b.r.demandeur ?? ""}
                        {enAttente && " · en attente"}
                      </span>
                    </button>
                  );
                }),
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Deux réservations qui se chevauchent sur la même salle ouvrent deux voies —
 *  c'est justement le cas qu'il ne faut pas cacher. */
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
