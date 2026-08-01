"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  CheckOutlined,
  SearchOutlined,
  TuneOutlined,
} from "@mui/icons-material";

/** Menu d'affichage GÉNÉRIQUE : des groupes d'options cochables, cherchables.
 *
 *  Il remplace les rangées de puces posées côte à côte : celles-ci tiennent tant
 *  qu'on en a cinq, débordent à dix, et n'ont nulle part où accueillir la
 *  suivante. Un menu, lui, grandit sans repousser le reste de la barre.
 *
 *  La recherche porte sur TOUS les groupes à la fois : quand on tape « urgent »,
 *  on cherche une étiquette sans avoir à savoir dans quelle rubrique elle a été
 *  rangée.
 */

export interface OptionAffichage {
  cle: string;
  libelle: string;
  /** Classe de fond d'une pastille de couleur, quand l'option en porte une. */
  teinte?: string;
  /** Compte affiché à droite — combien d'éléments portent cette option. */
  compte?: number;
}

export interface GroupeAffichage {
  cle: string;
  libelle: string;
  options: OptionAffichage[];
  /** Message affiché à la place du groupe quand il est vide. */
  vide?: string;
}

export function MenuAffichage({
  groupes,
  selection,
  onChange,
  libelle = "Affichage",
  /** Nombre d'options actives à ne PAS compter dans la pastille (les valeurs
   *  par défaut, qui ne sont pas un filtre choisi). */
  parDefaut = 0,
}: {
  groupes: GroupeAffichage[];
  selection: Set<string>;
  onChange: (selection: Set<string>) => void;
  libelle?: string;
  parDefaut?: number;
}) {
  const [ouvert, setOuvert] = useState(false);
  const [recherche, setRecherche] = useState("");
  const [monte, setMonte] = useState(false);
  const ancre = useRef<HTMLDivElement>(null);
  const menu = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null);

  useEffect(() => setMonte(true), []);

  // Portalisé : dans le flux, le menu serait rogné par la barre d'outils, qui
  // masque son débordement pour tenir sur une ligne.
  useLayoutEffect(() => {
    if (!ouvert || !ancre.current) return;
    const r = ancre.current.getBoundingClientRect();
    setPosition({ top: r.bottom + 6, left: Math.max(8, Math.min(r.left, window.innerWidth - 320)) });
  }, [ouvert]);

  useEffect(() => {
    if (!ouvert) return;
    const dehors = (e: MouseEvent) => {
      const cible = e.target as Node;
      if (!menu.current?.contains(cible) && !ancre.current?.contains(cible)) setOuvert(false);
    };
    const echap = (e: KeyboardEvent) => e.key === "Escape" && setOuvert(false);
    document.addEventListener("mousedown", dehors);
    document.addEventListener("keydown", echap);
    return () => {
      document.removeEventListener("mousedown", dehors);
      document.removeEventListener("keydown", echap);
    };
  }, [ouvert]);

  const filtres = useMemo(() => {
    const q = recherche.trim().toLowerCase();
    if (!q) return groupes;
    return groupes
      .map((g) => ({ ...g, options: g.options.filter((o) => o.libelle.toLowerCase().includes(q)) }))
      .filter((g) => g.options.length > 0);
  }, [groupes, recherche]);

  function basculer(cle: string) {
    const suivante = new Set(selection);
    if (suivante.has(cle)) suivante.delete(cle);
    else suivante.add(cle);
    onChange(suivante);
  }

  const actives = Math.max(0, selection.size - parDefaut);

  return (
    <div ref={ancre} className="inline-flex">
      <button
        type="button"
        aria-haspopup="dialog"
        aria-expanded={ouvert}
        onClick={() => setOuvert((v) => !v)}
        className={`inline-flex items-center gap-1.5 h-8 px-3 rounded-lg border text-body-sm font-medium transition-colors ${
          ouvert || actives > 0
            ? "border-primary bg-primary/10 text-primary"
            : "border-outline-soft text-on-surface-variant hover:bg-surface-container-low"
        }`}
      >
        <TuneOutlined style={{ fontSize: 16 }} />
        {libelle}
        {actives > 0 && (
          <span className="rounded-full bg-primary px-1.5 text-label-sm font-semibold text-on-primary tabular-nums">
            {actives}
          </span>
        )}
      </button>

      {monte &&
        ouvert &&
        position &&
        createPortal(
          <div
            ref={menu}
            role="dialog"
            aria-label={libelle}
            style={{ top: position.top, left: position.left }}
            className="fixed z-[110] w-[19rem] max-w-[92vw] overflow-hidden rounded-2xl border border-outline-soft bg-surface-container-lowest shadow-drawer animate-pop-in"
          >
            <div className="flex items-center gap-2 border-b border-hairline px-3 py-2">
              <SearchOutlined style={{ fontSize: 16 }} className="flex-none text-outline" />
              <input
                autoFocus
                aria-label="Rechercher un filtre"
                value={recherche}
                onChange={(e) => setRecherche(e.target.value)}
                placeholder="Rechercher un filtre, une étiquette…"
                className="w-full bg-transparent text-body-sm text-on-surface outline-none placeholder:text-outline-variant"
              />
            </div>

            <div className="max-h-[19rem] overflow-y-auto py-1">
              {filtres.length === 0 && (
                <p className="px-3 py-3 text-body-sm text-on-surface-variant">
                  Aucun filtre ne correspond.
                </p>
              )}

              {filtres.map((groupe) => (
                <div key={groupe.cle} className="py-1">
                  <p className="px-3 pb-1 text-label-sm uppercase text-outline">{groupe.libelle}</p>
                  {groupe.options.length === 0 && groupe.vide && (
                    <p className="px-3 py-1 text-body-sm text-outline-variant">{groupe.vide}</p>
                  )}
                  {groupe.options.map((option) => {
                    const coche = selection.has(option.cle);
                    return (
                      <button
                        key={option.cle}
                        type="button"
                        role="checkbox"
                        aria-checked={coche}
                        onClick={() => basculer(option.cle)}
                        className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-body-sm text-on-surface hover:bg-surface-container-low transition-colors"
                      >
                        <span
                          className={`flex h-4 w-4 flex-none items-center justify-center rounded border transition-colors ${
                            coche
                              ? "border-primary bg-primary text-on-primary"
                              : "border-outline-variant"
                          }`}
                        >
                          {coche && <CheckOutlined style={{ fontSize: 12 }} />}
                        </span>
                        {option.teinte && (
                          <span className={`h-2 w-2 flex-none rounded-full ${option.teinte}`} />
                        )}
                        <span className="min-w-0 flex-1 truncate">{option.libelle}</span>
                        {option.compte != null && (
                          <span className="flex-none text-label-md tabular-nums text-outline">
                            {option.compte}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}
