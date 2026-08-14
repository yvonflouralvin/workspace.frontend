"use client";

import type { Annee, Etablissement } from "@/app/lib/api";

const CHAMP =
  "h-9 rounded-lg border border-outline-soft bg-surface-container-lowest px-3 text-body-sm text-on-surface outline-none transition-colors focus:border-primary";

/** L'établissement et l'année sur lesquels on travaille, en haut de chaque écran.
 *
 *  Visible en permanence, parce que se tromper d'année est l'erreur la plus
 *  coûteuse du domaine : on inscrit dans la mauvaise, et personne ne s'en
 *  aperçoit avant la rentrée.
 */
export function BarreContexte({
  etablissements,
  etablissement,
  onEtablissement,
  annees,
  annee,
  onAnnee,
}: {
  etablissements: Etablissement[] | null;
  etablissement: Etablissement | null;
  onEtablissement: (e: Etablissement) => void;
  annees?: Annee[];
  annee?: Annee | null;
  onAnnee?: (id: number) => void;
}) {
  return (
    <div className="mb-5 flex flex-wrap items-center gap-2">
      {(etablissements?.length ?? 0) > 1 && (
        <select
          aria-label="Établissement"
          className={CHAMP}
          value={etablissement?.id ?? ""}
          onChange={(e) => {
            const choisi = etablissements?.find((x) => x.id === Number(e.target.value));
            if (choisi) onEtablissement(choisi);
          }}
        >
          {etablissements?.map((e) => (
            <option key={e.id} value={e.id}>
              {e.sigle ? `${e.sigle} — ${e.nom}` : e.nom}
            </option>
          ))}
        </select>
      )}

      {annees && onAnnee && (
        <label className="flex items-center gap-2 text-body-sm text-on-surface-variant">
          Année de travail
          <select
            aria-label="Année de travail"
            className={CHAMP}
            value={annee?.id ?? ""}
            onChange={(e) => onAnnee(Number(e.target.value))}
          >
            {annees.length === 0 && <option value="">Aucune année</option>}
            {annees.map((a) => (
              <option key={a.id} value={a.id}>
                {a.libelle} — {a.etat_libelle}
              </option>
            ))}
          </select>
        </label>
      )}
    </div>
  );
}
