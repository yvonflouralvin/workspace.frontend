"use client";

import { useEffect, useRef, useState } from "react";
import { ExpandMoreOutlined } from "@mui/icons-material";

export interface VueDef {
  cle: string;
  libelle: string;
  description: string;
  icone: React.ReactNode;
}

/** Le sélecteur de vue d'un menu.
 *
 *  Un menu d'Operations rassemble plusieurs écrans qui parlent du même sujet —
 *  pour « Plannings » : les plannings eux-mêmes, mais aussi les ressources qu'on
 *  y affecte et les sites où l'on va. Les mettre côte à côte dans la barre
 *  latérale les ferait passer pour des sujets distincts, et cette barre
 *  s'allongerait à chaque module ajouté.
 *
 *  Le sujet reste donc dans la barre latérale ; ce qu'on regarde du sujet se
 *  choisit ici. */
export function SelecteurVue({
  vues,
  courante,
  onChange,
}: {
  vues: VueDef[];
  courante: string;
  onChange: (cle: string) => void;
}) {
  const [ouvert, setOuvert] = useState(false);
  const conteneur = useRef<HTMLDivElement>(null);
  const active = vues.find((v) => v.cle === courante) ?? vues[0];

  useEffect(() => {
    if (!ouvert) return;
    const dehors = (e: MouseEvent) => {
      if (conteneur.current && !conteneur.current.contains(e.target as Node)) setOuvert(false);
    };
    const echap = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOuvert(false);
    };
    document.addEventListener("mousedown", dehors);
    document.addEventListener("keydown", echap);
    return () => {
      document.removeEventListener("mousedown", dehors);
      document.removeEventListener("keydown", echap);
    };
  }, [ouvert]);

  return (
    <div ref={conteneur} className="relative">
      <button
        type="button"
        onClick={() => setOuvert((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={ouvert}
        className="inline-flex h-10 items-center gap-2 rounded-xl border border-outline-soft bg-surface-container-lowest px-3 text-body-md text-on-surface transition-colors hover:bg-surface-container-low"
      >
        <span className="text-on-surface-variant">{active.icone}</span>
        <span className="font-medium">{active.libelle}</span>
        <ExpandMoreOutlined
          style={{ fontSize: 18 }}
          className={`text-on-surface-variant transition-transform ${ouvert ? "rotate-180" : ""}`}
        />
      </button>

      {ouvert && (
        <div
          role="listbox"
          className="absolute left-0 top-[calc(100%+4px)] z-40 w-[19rem] overflow-hidden rounded-xl border border-outline-soft bg-surface-container-lowest shadow-drawer animate-pop-in"
        >
          {vues.map((v) => {
            const on = v.cle === active.cle;
            return (
              <button
                key={v.cle}
                type="button"
                role="option"
                aria-selected={on}
                onClick={() => {
                  onChange(v.cle);
                  setOuvert(false);
                }}
                className={`flex w-full items-start gap-3 px-3 py-2.5 text-left transition-colors ${
                  on ? "bg-surface-container-low" : "hover:bg-surface-container-low"
                }`}
              >
                <span className={`mt-0.5 ${on ? "text-primary" : "text-on-surface-variant"}`}>
                  {v.icone}
                </span>
                <span className="min-w-0">
                  <span className="block text-body-sm font-medium text-on-surface">{v.libelle}</span>
                  <span className="block text-label-md text-on-surface-variant">
                    {v.description}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
