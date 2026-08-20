"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/** Une saisie rapide en surimpression — le geste de la recherche globale.
 *
 *  **Étroite et sur une seule colonne, volontairement.** Trois ou quatre champs
 *  courts se lisent de haut en bas ; les étaler sur deux colonnes donne la
 *  largeur d'un formulaire de saisie complète, et fait perdre l'impression de
 *  fenêtre légère qui rend la palette agréable. Une création qui a besoin de
 *  plus de champs que ça n'est pas une saisie rapide : elle appartient à un
 *  écran.
 *
 *  Surgir par-dessus la page, prendre le clavier, se fermer à Échap : c'est ce
 *  que l'utilisateur a déjà appris de la palette. Un formulaire de création qui
 *  s'ouvre autrement lui demande d'apprendre une deuxième fois.
 *
 *  Elle ne sait RIEN de ce qu'elle crée : l'appelant déclare ses champs et
 *  reçoit les valeurs. C'est ce qui lui permet de servir un étudiant
 *  aujourd'hui, un patient ou un article demain — plutôt que dix modales qui
 *  doivent se comporter pareil et divergent dès la première retouche.
 *
 *  Elle **n'enregistre pas** : elle rend les valeurs et laisse l'appelant
 *  décider. Sinon il faudrait lui apprendre les erreurs de chaque backend.
 */

export type TypeChamp = "texte" | "choix";

export interface ChampRapide {
  nom: string;
  libelle: string;
  type?: TypeChamp;
  /** Un champ requis désactive la validation tant qu'il est vide. */
  requis?: boolean;
  options?: { valeur: string; libelle: string }[];
  aide?: string;
}

export function SaisieRapide({
  titre,
  intro,
  champs,
  libelleValider = "Créer",
  busy = false,
  erreur,
  onValider,
  onFermer,
}: {
  titre: string;
  intro?: string;
  champs: ChampRapide[];
  libelleValider?: string;
  busy?: boolean;
  erreur?: string | null;
  onValider: (valeurs: Record<string, string>) => void;
  onFermer: () => void;
}) {
  const [valeurs, setValeurs] = useState<Record<string, string>>(() =>
    Object.fromEntries(champs.map((c) => [c.nom, ""]))
  );
  const premier = useRef<HTMLInputElement | HTMLSelectElement | null>(null);

  useEffect(() => {
    premier.current?.focus();
  }, []);

  const complet = champs.every((c) => !c.requis || (valeurs[c.nom] ?? "").trim());

  const auClavier = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onFermer();
      }
      // Entrée valide de n'importe quel champ : dans une saisie rapide, viser
      // le bouton à la souris annule le gain de la palette.
      if (e.key === "Enter" && !e.shiftKey && complet && !busy) {
        e.preventDefault();
        onValider(valeurs);
      }
    },
    [onFermer, onValider, valeurs, complet, busy]
  );

  useEffect(() => {
    document.addEventListener("keydown", auClavier);
    return () => document.removeEventListener("keydown", auClavier);
  }, [auClavier]);

  return (
    <div
      className="animate-overlay-in fixed inset-0 z-50 flex items-start justify-center bg-overlay px-4 pt-[12vh]"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onFermer();
      }}
    >
      <div
        role="dialog"
        aria-label={titre}
        className="animate-pop-in w-full max-w-[20rem] overflow-hidden rounded-2xl border border-outline-soft bg-surface-container-lowest shadow-modal"
      >
        <header className="border-b border-hairline px-4 py-3">
          <p className="font-display text-body-lg font-semibold text-on-surface">{titre}</p>
          {intro && <p className="mt-0.5 text-label-md text-outline">{intro}</p>}
        </header>

        <div className="space-y-2.5 p-4">
          {champs.map((champ, rang) => (
            <label key={champ.nom} className="block">
              <span className="block text-label-md font-medium text-on-surface-variant">
                {champ.libelle}
                {champ.requis && <span className="ml-0.5 text-error">*</span>}
              </span>
              {champ.type === "choix" ? (
                <select
                  ref={rang === 0 ? (n) => {
                    premier.current = n;
                  } : undefined}
                  className="mt-1 h-10 w-full rounded-lg border border-outline-soft bg-surface-container-lowest px-3 text-body-sm text-on-surface outline-none transition-colors focus:border-primary"
                  value={valeurs[champ.nom] ?? ""}
                  onChange={(e) =>
                    setValeurs((v) => ({ ...v, [champ.nom]: e.target.value }))
                  }
                >
                  <option value="">—</option>
                  {(champ.options ?? []).map((o) => (
                    <option key={o.valeur} value={o.valeur}>
                      {o.libelle}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  ref={rang === 0 ? (n) => {
                    premier.current = n;
                  } : undefined}
                  className="mt-1 h-10 w-full rounded-lg border border-outline-soft bg-surface-container-lowest px-3 text-body-sm text-on-surface outline-none transition-colors focus:border-primary"
                  value={valeurs[champ.nom] ?? ""}
                  onChange={(e) =>
                    setValeurs((v) => ({ ...v, [champ.nom]: e.target.value }))
                  }
                />
              )}
              {champ.aide && (
                <span className="mt-0.5 block text-label-sm text-outline">{champ.aide}</span>
              )}
            </label>
          ))}
        </div>

        {erreur && (
          <p className="mx-4 mb-3 rounded-lg bg-error-container/40 px-3 py-2 text-body-sm text-error">
            {erreur}
          </p>
        )}

        <footer className="flex flex-wrap items-center gap-2 border-t border-hairline px-4 py-3">
          <button
            type="button"
            disabled={busy || !complet}
            onClick={() => onValider(valeurs)}
            className="inline-flex h-9 items-center rounded-lg bg-primary px-4 text-body-sm font-semibold text-on-primary transition-colors hover:bg-primary-container disabled:opacity-50"
          >
            {busy ? "…" : libelleValider}
          </button>
          <button
            type="button"
            onClick={onFermer}
            className="h-9 rounded-lg px-3 text-body-sm text-on-surface-variant transition-colors hover:bg-surface-container"
          >
            Annuler
          </button>
          <span className="ml-auto text-label-sm text-outline">Entrée · Échap</span>
        </footer>
      </div>
    </div>
  );
}
