"use client";

import { useState } from "react";
import {
  CloseOutlined,
  ExpandMoreOutlined,
  GroupsOutlined,
} from "@mui/icons-material";
import { MultiSelect } from "./MultiSelect";
import {
  basculerSection,
  cleGrant,
  libelleGrant,
  majGroupes,
  majPersonnes,
  retirerGrant,
  type PartageGrant,
  type PartageOption,
  type PartageSection,
} from "./partage-grants";

export type { PartageGrant, PartageOption, PartageSection };

/** L'éditeur de partage d'une fiche : qui y a accès, et à quelles sections.
 *
 *  PRÉSENTATIONNEL — aucun appel réseau, tout par props, comme les widgets de
 *  reporting. Deux applications montrent la même fiche client (le module Tiers
 *  et Business Firm Mission) et le partage doit se régler depuis les deux :
 *  seul le CHEMIN des appels diffère d'une app à l'autre, pas l'écran. C'est
 *  l'hôte qui charge et qui enregistre, parce que l'un est une page et l'autre
 *  un onglet, avec son propre bouton.
 *
 *  `sections` vient du SERVEUR, jamais d'une liste écrite ici : c'est lui qui
 *  les applique, et une copie dans l'écran se périmerait à la section suivante.
 *  Une liste de sections VIDE sur une ligne vaut accès complet — y compris aux
 *  sections qui n'existaient pas quand on l'a posée.
 */
export function PartageFiche({
  grants,
  onChange,
  personnes,
  groupes,
  sections,
  createurId,
  createurLabel,
}: {
  grants: PartageGrant[];
  onChange: (grants: PartageGrant[]) => void;
  personnes: PartageOption[];
  groupes: PartageOption[];
  sections: PartageSection[];
  createurId?: number | null;
  createurLabel?: string;
}) {
  const [ouverte, setOuverte] = useState<string | null>(null);

  // Le créateur a déjà tout : le proposer laisserait croire qu'on peut lui
  // retirer un accès, et le serveur écarte la ligne de toute façon.
  const personnesProposables = personnes.filter((p) => p.id !== createurId);

  function retirer(g: PartageGrant) {
    onChange(retirerGrant(grants, g));
    if (ouverte === cleGrant(g)) setOuverte(null);
  }

  return (
    <div className="rounded-2xl border border-outline-soft bg-surface-container-lowest p-4 md:p-5 space-y-5">
      <div>
        <span className="block text-label-sm uppercase text-outline mb-1.5">Créé par</span>
        <p className="text-body-md text-on-surface">
          {createurLabel ?? "Inconnu"}
          <span className="ml-2 text-label-sm text-outline">Accès complet</span>
        </p>
      </div>

      <div>
        <span className="block text-label-sm uppercase text-outline mb-1.5">
          Ajouter une personne
        </span>
        <MultiSelect
          options={personnesProposables}
          selectedIds={grants
            .filter((g) => g.user_id !== null)
            .map((g) => g.user_id as number)}
          onChange={(ids) => onChange(majPersonnes(grants, ids as number[]))}
          placeholder="Rechercher une personne du workspace…"
          emptyLabel="Aucun membre trouvé."
        />
      </div>

      <div>
        <span className="block text-label-sm uppercase text-outline mb-1.5">
          Ajouter un groupe
        </span>
        <MultiSelect
          options={groupes}
          selectedIds={grants
            .filter((g) => g.groupe_id !== null)
            .map((g) => g.groupe_id as number)}
          onChange={(ids) => onChange(majGroupes(grants, ids as number[]))}
          placeholder="Rechercher un groupe du workspace…"
          emptyLabel="Aucun groupe trouvé."
        />
      </div>

      {grants.length > 0 && (
        <div>
          <span className="block text-label-sm uppercase text-outline mb-1.5">Autorisés</span>
          <ul className="rounded-xl border border-outline-soft divide-y divide-hairline overflow-hidden">
            {grants.map((g) => {
              const k = cleGrant(g);
              const complet = g.sections.length === 0;
              const ouvert = ouverte === k;
              return (
                <li key={k} className="bg-surface-container-lowest">
                  <div className="flex items-center gap-2 px-3 py-2.5">
                    <button
                      type="button"
                      onClick={() => setOuverte(ouvert ? null : k)}
                      className="flex flex-1 items-center gap-2 min-w-0 text-left"
                    >
                      <ExpandMoreOutlined
                        style={{ fontSize: 18 }}
                        className={`shrink-0 text-outline transition-transform ${ouvert ? "rotate-180" : ""}`}
                      />
                      {g.groupe_id !== null && (
                        <GroupsOutlined
                          style={{ fontSize: 15 }}
                          className="shrink-0 text-outline"
                        />
                      )}
                      <span className="text-body-md text-on-surface truncate">
                        {libelleGrant(g, personnes, groupes)}
                      </span>
                      <span className="text-label-md text-outline shrink-0">
                        {complet
                          ? "Accès complet"
                          : `${g.sections.length}/${sections.length} section${sections.length > 1 ? "s" : ""}`}
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => retirer(g)}
                      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-on-surface-variant hover:bg-surface-container-low transition-colors"
                      aria-label="Retirer"
                    >
                      <CloseOutlined style={{ fontSize: 15 }} />
                    </button>
                  </div>
                  {ouvert && (
                    <div className="px-3 pb-3 pl-9 space-y-1.5">
                      {sections.map((s) => (
                        <label
                          key={s.key}
                          className="flex items-center gap-2 text-body-sm text-on-surface cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={complet || g.sections.includes(s.key)}
                            onChange={() =>
                              onChange(
                                basculerSection(grants, g, s.key, sections.map((x) => x.key)),
                              )
                            }
                            className="rounded border-outline-soft accent-primary"
                          />
                          {s.label}
                        </label>
                      ))}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
