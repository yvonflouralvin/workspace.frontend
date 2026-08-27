"use client";

import { useEffect, useRef } from "react";
import { Icon } from "@repo/ui/Icon";

import { WIDGETS_PALETTE } from "@repo/site-widgets/catalogue";

/** Le choix d'un bloc, en surimpression, à l'endroit où on a cliqué.
 *
 *  Une modale plein écran pour poser un titre serait disproportionnée : le
 *  geste est court, et on veut garder sous les yeux la colonne qu'on remplit.
 *  Elle se ferme à Échap et au clic extérieur — comme tout ce qui surgit.
 */
export function ChoixBloc({
  ancre,
  onChoisir,
  onFermer,
}: {
  ancre: { x: number; y: number };
  onChoisir: (type: string) => void;
  onFermer: () => void;
}) {
  const boite = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function auClavier(e: KeyboardEvent) {
      if (e.key === "Escape") onFermer();
    }
    function auClic(e: MouseEvent) {
      if (!boite.current?.contains(e.target as Node)) onFermer();
    }
    document.addEventListener("keydown", auClavier);
    // `mousedown` et non `click` : le clic qui a ouvert la fenêtre finirait
    // sinon par la refermer aussitôt.
    document.addEventListener("mousedown", auClic);
    return () => {
      document.removeEventListener("keydown", auClavier);
      document.removeEventListener("mousedown", auClic);
    };
  }, [onFermer]);

  // Bornée à la fenêtre : ouverte près du bord droit, elle sortirait de l'écran.
  const largeur = 260;
  const x = Math.min(ancre.x, (typeof window === "undefined" ? 1200 : window.innerWidth) - largeur - 12);
  const y = Math.min(ancre.y, (typeof window === "undefined" ? 800 : window.innerHeight) - 300);

  return (
    <div
      ref={boite}
      role="dialog"
      aria-label="Choisir un bloc"
      style={{ position: "fixed", left: Math.max(12, x), top: Math.max(12, y), width: largeur }}
      className="z-[70] rounded-xl border border-outline-soft bg-surface-container-lowest p-2 shadow-lg"
    >
      <p className="px-1 pb-1.5 text-label-sm text-on-surface-variant">Ajouter un bloc</p>
      <div className="grid grid-cols-2 gap-1">
        {WIDGETS_PALETTE.map((widget) => (
          <button
            key={widget.cle}
            type="button"
            title={widget.description ?? widget.libelle}
            onClick={() => onChoisir(widget.cle)}
            className="flex flex-col items-center gap-1 rounded-lg border border-outline-soft px-2 py-2.5 text-center transition-colors hover:border-primary hover:text-primary"
          >
            <Icon name={widget.icone} className="text-[18px]" />
            <span className="text-label-sm leading-tight">{widget.libelle}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
