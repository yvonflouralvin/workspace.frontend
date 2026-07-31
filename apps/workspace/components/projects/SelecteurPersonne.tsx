"use client";

import { SearchSelect } from "@repo/ui/SearchSelect";
import type { ProjectGroup } from "@/app/lib/projects-api";
import type { Member } from "@/app/(dashboard)/projects/[id]/project-context";

/** Choisir QUI — une personne, ou un groupe quand c'est permis.
 *
 *  Les listes déroulantes natives obligeaient à parcourir tout le workspace à la
 *  molette : passable à cinq membres, inutilisable à cinquante. Ici on tape trois
 *  lettres.
 *
 *  Un seul champ pour les deux natures là où elles coexistent : demander « une
 *  personne OU un groupe » dans deux listes séparées laisse la porte ouverte à en
 *  remplir deux, et oblige l'utilisateur à savoir d'avance dans laquelle chercher.
 */

export interface ChoixPersonne {
  userId: number | null;
  groupeId: number | null;
}

interface Option {
  id: string;
  label: string;
  /** Rangé après les personnes, et annoncé comme groupe. */
  estGroupe: boolean;
}

export function SelecteurPersonne({
  valeur,
  membres,
  groupes,
  onChange,
  disabled,
  placeholder = "Rechercher une personne…",
  vide = "Non assigné",
}: {
  valeur: ChoixPersonne;
  membres: Member[];
  /** Omis = personnes uniquement. */
  groupes?: ProjectGroup[];
  onChange: (choix: ChoixPersonne) => void;
  disabled?: boolean;
  placeholder?: string;
  /** Libellé de l'option « aucun ». */
  vide?: string;
}) {
  const options: Option[] = [
    { id: "", label: vide, estGroupe: false },
    ...membres.map((m) => ({ id: `u-${m.id}`, label: m.name, estGroupe: false })),
    ...(groupes ?? []).map((g) => ({
      id: `g-${g.id}`,
      label: `Groupe · ${g.name}`,
      estGroupe: true,
    })),
  ];

  const courant =
    valeur.userId != null ? `u-${valeur.userId}` : valeur.groupeId != null ? `g-${valeur.groupeId}` : "";
  const libelleCourant = options.find((o) => o.id === courant)?.label ?? vide;

  return (
    <SearchSelect<Option>
      value={courant}
      initialLabel={libelleCourant}
      placeholder={placeholder}
      disabled={disabled}
      getOptionLabel={(o) => o.label}
      getOptionValue={(o) => o.id}
      // Filtrage LOCAL : les membres sont déjà chargés par le contexte du projet,
      // un aller-retour réseau par frappe n'apprendrait rien de plus.
      fetchOptions={async (query) => {
        const q = query.trim().toLowerCase();
        if (!q) return options;
        return options.filter((o) => o.id !== "" && o.label.toLowerCase().includes(q));
      }}
      onChange={(_, record) => {
        if (!record || !record.id) {
          onChange({ userId: null, groupeId: null });
          return;
        }
        const numero = Number(record.id.slice(2));
        onChange(
          record.estGroupe ? { userId: null, groupeId: numero } : { userId: numero, groupeId: null }
        );
      }}
    />
  );
}
