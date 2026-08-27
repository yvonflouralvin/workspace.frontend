"use client";

import { CloseOutlined } from "@mui/icons-material";
import { SearchField } from "@repo/ui/SearchField";

import type { StatutExecution } from "@/lib/operations-api";

export type FiltreStatut = "tous" | StatutExecution;

export interface FiltresExec {
  q: string;
  statut: FiltreStatut;
  du: string;
  au: string;
}

export const FILTRES_VIDES: FiltresExec = { q: "", statut: "tous", du: "", au: "" };

const STATUTS: { cle: FiltreStatut; libelle: string }[] = [
  { cle: "tous", libelle: "Toutes" },
  { cle: "EN_COURS", libelle: "En cours" },
  { cle: "TERMINEE", libelle: "Terminées" },
  { cle: "ABANDONNEE", libelle: "Abandonnées" },
];

const DATE =
  "h-[38px] rounded-lg border border-outline-soft bg-surface-container-lowest px-2 text-body-sm text-on-surface outline-none transition-colors focus:border-primary";

export function estFiltre(f: FiltresExec) {
  return f.q !== "" || f.statut !== "tous" || f.du !== "" || f.au !== "";
}

/** Les filtres du registre des exécutions.
 *
 *  L'intervalle porte sur l'OUVERTURE de l'exécution — le moment où l'agent
 *  était sur place — et il est inclusif des deux bouts : on demande « du 1er au
 *  31 », pas « jusqu'au 31 à minuit ».
 */
export function FiltresExecutions({
  valeurs,
  onChange,
  avecRecherche = true,
}: {
  valeurs: FiltresExec;
  onChange: (valeurs: FiltresExec) => void;
  avecRecherche?: boolean;
}) {
  const maj = (patch: Partial<FiltresExec>) => onChange({ ...valeurs, ...patch });

  return (
    <div className="flex flex-wrap items-center gap-2">
      {avecRecherche && (
        <SearchField
          value={valeurs.q}
          onChange={(q) => maj({ q })}
          placeholder="Rechercher un process…"
          className="w-full sm:w-[16rem]"
        />
      )}

      <div className="flex flex-wrap gap-1.5">
        {STATUTS.map((s) => (
          <button
            key={s.cle}
            type="button"
            onClick={() => maj({ statut: s.cle })}
            className={`h-8 rounded-full px-3 text-label-md transition-colors ${
              valeurs.statut === s.cle
                ? "bg-primary text-on-primary"
                : "border border-outline-soft text-on-surface-variant hover:border-primary hover:text-primary"
            }`}
          >
            {s.libelle}
          </button>
        ))}
      </div>

      <span className="flex items-center gap-1.5">
        <span className="text-label-md text-outline">du</span>
        <input
          type="date"
          className={DATE}
          value={valeurs.du}
          max={valeurs.au || undefined}
          onChange={(e) => maj({ du: e.target.value })}
        />
        <span className="text-label-md text-outline">au</span>
        <input
          type="date"
          className={DATE}
          value={valeurs.au}
          min={valeurs.du || undefined}
          onChange={(e) => maj({ au: e.target.value })}
        />
      </span>

      {estFiltre(valeurs) && (
        <button
          type="button"
          onClick={() => onChange(FILTRES_VIDES)}
          className="inline-flex h-8 items-center gap-1 rounded-lg px-2 text-label-md text-on-surface-variant transition-colors hover:text-primary"
        >
          <CloseOutlined style={{ fontSize: 15 }} />
          Réinitialiser
        </button>
      )}
    </div>
  );
}
