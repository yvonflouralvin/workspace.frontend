"use client";

import { useMemo, useState } from "react";
import { CloseOutlined, PersonOutlined } from "@mui/icons-material";
import { PaletteRecherche } from "@repo/ui/PaletteRecherche";
import type { Membre } from "@/lib/membres-api";

/** Le choix d'une personne, en popup — le geste de la recherche globale.
 *
 *  La liste est celle des membres du workspace, déjà chargée par le layout de la
 *  mission : on filtre en local, sans aller-retour réseau à chaque frappe. */
export function PaletteMembres({
  titre = "Choisir un membre",
  membres,
  exclus = [],
  vide,
  onChoisir,
  onFermer,
}: {
  titre?: string;
  membres: Membre[];
  /** Déjà dans la liste : ne pas les proposer deux fois. */
  exclus?: number[];
  vide?: string;
  onChoisir: (membre: Membre) => void;
  onFermer: () => void;
}) {
  const [recherche, setRecherche] = useState("");

  const entrees = useMemo(() => {
    const q = recherche.trim().toLowerCase();
    return membres
      .filter((m) => !exclus.includes(m.id) && (!q || m.name.toLowerCase().includes(q)))
      .map((m) => ({
        cle: String(m.id),
        titre: m.name,
        icone: <PersonOutlined style={{ fontSize: 18 }} />,
      }));
  }, [membres, exclus, recherche]);

  return (
    <PaletteRecherche
      titre={titre}
      placeholder="Rechercher un membre du workspace…"
      entrees={entrees}
      recherche={recherche}
      onRecherche={setRecherche}
      onChoisir={(e) => {
        const membre = membres.find((m) => String(m.id) === e.cle);
        if (membre) onChoisir(membre);
      }}
      onFermer={onFermer}
      vide={
        vide ??
        (recherche.trim() ? "Aucun membre ne correspond." : "Tous les membres du workspace sont déjà ajoutés.")
      }
    />
  );
}

/** Une personne dans un champ : le nom (ou un invite), un clic ouvre la palette. */
export function ChampMembre({
  valeur,
  membres,
  onChange,
  placeholder = "Choisir…",
  disabled = false,
}: {
  valeur: number | null;
  membres: Membre[];
  onChange: (id: number | null) => void;
  placeholder?: string;
  disabled?: boolean;
}) {
  const [ouvert, setOuvert] = useState(false);
  const courant = valeur === null ? null : membres.find((m) => m.id === valeur);
  const libelle = valeur === null ? null : (courant?.name ?? `Utilisateur #${valeur}`);

  return (
    <>
      <span className="inline-flex items-center gap-1">
        <button
          type="button"
          disabled={disabled}
          onClick={() => setOuvert(true)}
          className="h-8 max-w-[190px] truncate rounded-lg border border-outline-soft bg-surface-container-lowest px-2.5 text-body-sm text-on-surface hover:border-primary outline-none focus:border-primary transition-colors disabled:opacity-60"
        >
          {libelle ?? <span className="text-outline">{placeholder}</span>}
        </button>
        {valeur !== null && !disabled && (
          <button
            type="button"
            onClick={() => onChange(null)}
            aria-label="Retirer"
            title="Retirer"
            className="w-6 h-6 flex items-center justify-center rounded-md text-outline hover:text-error transition-colors"
          >
            <CloseOutlined style={{ fontSize: 14 }} />
          </button>
        )}
      </span>
      {ouvert && (
        <PaletteMembres
          membres={membres}
          onChoisir={(m) => {
            setOuvert(false);
            onChange(m.id);
          }}
          onFermer={() => setOuvert(false)}
        />
      )}
    </>
  );
}
