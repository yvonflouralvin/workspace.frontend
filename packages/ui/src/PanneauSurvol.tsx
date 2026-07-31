"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

/** Panneau d'information au survol — remplace l'infobulle native.
 *
 *  Celle du navigateur arrive après une seconde, tronque, et ne sait afficher
 *  qu'une ligne de texte brut. Ici le contenu est libre et le panneau apparaît
 *  tout de suite.
 *
 *  Rendu dans un PORTAL : posé dans le flux, il serait rogné par le premier
 *  parent en `overflow-hidden` — et une frise défile, donc elle en a un.
 */

export interface PositionSurvol {
  x: number;
  y: number;
}

const MARGE = 14;

export function PanneauSurvol({
  position,
  children,
  onMouseEnter,
  onMouseLeave,
}: {
  position: PositionSurvol | null;
  children: ReactNode;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
}) {
  const [monte, setMonte] = useState(false);
  useEffect(() => setMonte(true), []);

  if (!monte || !position || typeof document === "undefined") return null;

  // Bascule à gauche ou au-dessus quand on approche du bord : un panneau qui
  // sort de l'écran ne se lit pas.
  const largeur = 280;
  const versLaGauche = position.x + largeur + MARGE > window.innerWidth;
  const versLeHaut = position.y + 160 > window.innerHeight;

  return createPortal(
    <div
      role="tooltip"
      style={{
        left: versLaGauche ? position.x - largeur - MARGE : position.x + MARGE,
        top: versLeHaut ? undefined : position.y + MARGE,
        bottom: versLeHaut ? window.innerHeight - position.y + MARGE : undefined,
        width: largeur,
      }}
      // Le panneau est CLIQUABLE : il porte un lien. Il faut donc pouvoir y
      // amener le pointeur, d'où la fermeture différée côté `useSurvol`.
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      className="fixed z-[80] rounded-xl border border-outline-soft bg-surface-container-lowest shadow-modal px-3 py-2.5"
    >
      {children}
    </div>,
    document.body
  );
}

/** Accroche le survol d'un élément. Renvoie les gestionnaires à étaler sur lui.
 *
 *  On suit le pointeur plutôt que d'ancrer au coin de l'élément : une bande de
 *  frise peut faire toute la largeur de l'écran, un panneau collé à son bord
 *  gauche serait à mille pixels du curseur.
 */
export function useSurvol<T>() {
  const [survole, setSurvole] = useState<{ cle: T; position: PositionSurvol } | null>(null);
  const fermeture = useRef<ReturnType<typeof setTimeout> | null>(null);

  const annuler = () => {
    if (fermeture.current) clearTimeout(fermeture.current);
    fermeture.current = null;
  };
  // Fermeture DIFFÉRÉE : le pointeur doit pouvoir traverser le vide entre
  // l'élément et le panneau pour atteindre son lien.
  const differer = () => {
    annuler();
    fermeture.current = setTimeout(() => setSurvole(null), 220);
  };

  const gestionnaires = (cle: T) => ({
    onMouseEnter: (e: React.MouseEvent) => {
      annuler();
      setSurvole({ cle, position: { x: e.clientX, y: e.clientY } });
    },
    onMouseMove: (e: React.MouseEvent) => {
      // Une fois le panneau ouvert, on le laisse en place : le déplacer sous le
      // pointeur le rendrait inatteignable.
      if (!survole) setSurvole({ cle, position: { x: e.clientX, y: e.clientY } });
    },
    onMouseLeave: differer,
    // Le clavier atteint aussi les éléments : le panneau doit suivre le focus.
    onFocus: (e: React.FocusEvent<HTMLElement>) => {
      const r = e.currentTarget.getBoundingClientRect();
      setSurvole({ cle, position: { x: r.left + r.width / 2, y: r.bottom } });
    },
    onBlur: differer,
  });

  const gestionnairesPanneau = { onMouseEnter: annuler, onMouseLeave: differer };

  return { survole, gestionnaires, gestionnairesPanneau, effacer: () => setSurvole(null) };
}
