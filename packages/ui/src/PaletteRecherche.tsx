"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { SearchOutlined } from "@mui/icons-material";

/** Une palette : on tape, on choisit, on repart.
 *
 *  Le geste que la recherche globale a déjà appris à l'utilisateur — surgir
 *  par-dessus la page, prendre le clavier, se fermer à Échap. Le reproduire à
 *  la main dans chaque écran ferait diverger dix palettes qui doivent se
 *  comporter pareil.
 *
 *  Elle ne sait RIEN de ce qu'elle liste : l'appelant fournit les entrées et
 *  dit quoi faire du choix. C'est ce qui lui permet de servir aussi bien un
 *  catalogue de formulaires qu'autre chose demain.
 */

export interface EntreePalette {
  cle: string;
  titre: string;
  description?: string | null;
  /** Ligne de contexte, à droite ou en dessous — ce qui distingue deux
   *  entrées de même titre. */
  detail?: string | null;
  icone?: ReactNode;
}

export function PaletteRecherche({
  titre,
  placeholder,
  entrees,
  chargement = false,
  recherche,
  onRecherche,
  onChoisir,
  onFermer,
  vide,
}: {
  titre?: string;
  placeholder?: string;
  entrees: EntreePalette[];
  chargement?: boolean;
  recherche: string;
  onRecherche: (q: string) => void;
  onChoisir: (entree: EntreePalette) => void;
  onFermer: () => void;
  vide?: string;
}) {
  const [survol, setSurvol] = useState(0);
  const listeRef = useRef<HTMLDivElement>(null);

  // Échap ferme, les flèches parcourent, Entrée choisit : sans clavier, une
  // palette n'est qu'une modale de plus.
  const auClavier = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onFermer();
        return;
      }
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSurvol((i) => Math.min(i + 1, entrees.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSurvol((i) => Math.max(i - 1, 0));
      } else if (e.key === "Enter" && entrees[survol]) {
        e.preventDefault();
        onChoisir(entrees[survol]);
      }
    },
    [entrees, survol, onChoisir, onFermer]
  );

  useEffect(() => {
    window.addEventListener("keydown", auClavier);
    return () => window.removeEventListener("keydown", auClavier);
  }, [auClavier]);

  // La sélection retombe en tête à chaque nouvelle liste : la garder pointerait
  // une entrée qui n'est plus la même.
  useEffect(() => setSurvol(0), [entrees]);

  useEffect(() => {
    const actif = listeRef.current?.querySelector<HTMLElement>("[data-survol='true']");
    actif?.scrollIntoView({ block: "nearest" });
  }, [survol]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-overlay pt-24 backdrop-blur-sm animate-overlay-in"
      onClick={onFermer}
    >
      <div
        role="dialog"
        aria-label={titre ?? "Recherche"}
        className="w-full max-w-[36rem] overflow-hidden rounded-2xl bg-surface-container-lowest shadow-modal animate-pop-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 border-b border-outline-variant px-4 py-3">
          <SearchOutlined className="shrink-0 text-on-surface-variant" style={{ fontSize: 20 }} />
          <input
            autoFocus
            value={recherche}
            onChange={(e) => onRecherche(e.target.value)}
            placeholder={placeholder ?? "Rechercher…"}
            aria-label={placeholder ?? "Rechercher"}
            className="flex-1 bg-transparent text-body-md text-on-surface outline-none placeholder:text-on-surface-variant"
          />
          {chargement && (
            <span className="shrink-0 animate-pulse text-label-sm text-on-surface-variant">
              Recherche…
            </span>
          )}
          <kbd className="shrink-0 rounded bg-surface-container px-1.5 py-0.5 font-mono text-xs text-outline">
            Esc
          </kbd>
        </div>

        <div ref={listeRef} className="max-h-[min(60vh,420px)] overflow-y-auto p-1.5">
          {entrees.length === 0 ? (
            <p className="px-3 py-10 text-center text-body-sm text-on-surface-variant">
              {chargement ? "Recherche…" : (vide ?? "Aucun résultat.")}
            </p>
          ) : (
            entrees.map((entree, i) => (
              <button
                key={entree.cle}
                type="button"
                data-survol={i === survol}
                onMouseEnter={() => setSurvol(i)}
                onClick={() => onChoisir(entree)}
                className={`flex w-full items-start gap-3 rounded-xl px-3 py-2.5 text-left transition-colors ${
                  i === survol ? "bg-surface-container-low" : ""
                }`}
              >
                {entree.icone && (
                  <span className="mt-0.5 flex-none text-outline">{entree.icone}</span>
                )}
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-body-md text-on-surface">{entree.titre}</span>
                  {entree.description && (
                    <span className="mt-0.5 line-clamp-1 block text-body-sm text-on-surface-variant">
                      {entree.description}
                    </span>
                  )}
                  {entree.detail && (
                    <span className="mt-0.5 block text-label-md text-outline">{entree.detail}</span>
                  )}
                </span>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
