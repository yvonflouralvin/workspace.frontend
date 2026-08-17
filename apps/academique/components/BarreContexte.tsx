"use client";

import type { Annee, Etablissement } from "@/app/lib/api";

const CHAMP =
  "h-9 rounded-lg border border-outline-soft bg-surface-container-lowest px-3 text-body-sm text-on-surface outline-none transition-colors focus:border-primary";

/** L'année sur laquelle on travaille, en haut de chaque écran.
 *
 *  Visible en permanence, parce que se tromper d'année est l'erreur la plus
 *  coûteuse du domaine : on inscrit dans la mauvaise, et personne ne s'en
 *  aperçoit avant la rentrée. Elle porte son nom en clair — une liste
 *  déroulante nue n'apprend pas ce qu'elle commande.
 *
 *  **L'établissement ne se choisit pas** : un workspace en EST un. La barre le
 *  rappelle en toutes lettres, sans en faire une question.
 */
export function BarreContexte({
  etablissement,
  surnombre = [],
  annees,
  annee,
  onAnnee,
}: {
  etablissement: Etablissement | null;
  /** Les établissements en trop dans ce workspace — normalement aucun. */
  surnombre?: Etablissement[];
  annees?: Annee[];
  annee?: Annee | null;
  onAnnee?: (id: number) => void;
}) {
  const nom = etablissement
    ? etablissement.sigle
      ? `${etablissement.sigle} — ${etablissement.nom}`
      : etablissement.nom
    : null;

  return (
    <div className="mb-5 space-y-2">
      <div className="flex flex-wrap items-center gap-3">
        {nom && <span className="text-body-sm font-medium text-on-surface">{nom}</span>}

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

      {surnombre.length > 0 && (
        // Dire ce qu'on n'affiche PAS. Un écran qui prend le premier
        // établissement en silence fait chercher des étudiants qui existent.
        <p className="rounded-lg bg-error-container/30 px-3 py-2 text-label-md text-on-surface-variant">
          Ce workspace porte {surnombre.length + 1} établissements alors qu&apos;il n&apos;en a
          qu&apos;un. Les écrans travaillent sur « {nom} » ; ce qui est rattaché à{" "}
          {surnombre.map((e) => `« ${e.sigle ? `${e.sigle} — ${e.nom}` : e.nom} »`).join(", ")}{" "}
          n&apos;apparaît nulle part.
        </p>
      )}
    </div>
  );
}
