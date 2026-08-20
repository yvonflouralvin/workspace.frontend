"use client";

import type { UniteAcademique } from "@/app/lib/api";

/** Le département et l'année, en haut de chaque écran.
 *
 *  Les deux viennent d'Academia. Les afficher en permanence évite d'instruire
 *  les travaux d'un département en croyant être dans un autre.
 */
export function BarreContexte({
  unites,
  unite,
  onUnite,
  annee,
}: {
  unites: UniteAcademique[];
  unite: UniteAcademique | null;
  onUnite: (u: UniteAcademique) => void;
  annee: { id: number; libelle: string } | null;
}) {
  return (
    <div className="mb-5 flex flex-wrap items-center gap-2">
      <select
        aria-label="Département"
        className="h-9 rounded-lg border border-outline-soft bg-surface-container-lowest px-3 text-body-sm text-on-surface outline-none focus:border-primary"
        value={unite?.id ?? ""}
        onChange={(e) => {
          const choisie = unites.find((u) => u.id === Number(e.target.value));
          if (choisie) onUnite(choisie);
        }}
      >
        {unites.length === 0 && <option value="">Aucun département</option>}
        {unites.map((u) => (
          <option key={u.id} value={u.id}>
            {u.libelle}
          </option>
        ))}
      </select>
      <span className="text-label-md text-outline">
        {annee ? `Année ${annee.libelle}` : "Aucune année ouverte"}
      </span>
    </div>
  );
}
