"use client";

import { useEffect } from "react";
import { CloseOutlined } from "@mui/icons-material";

export function Modal({
  title,
  onClose,
  children,
  footer,
  headerAside,
  // Valeur arbitraire : les tokens nommés (sm/md/lg/xl) sont redéfinis par
  // --spacing-* dans le thème et collisionnent avec l'échelle max-w-*.
  width = "max-w-[28rem]",
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  /** Barre d'actions en pied de modale. */
  footer?: React.ReactNode;
  /** Contenu discret à droite du titre (ex. « Étape 1/2 »). */
  headerAside?: React.ReactNode;
  width?: string;
}) {
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end md:items-start justify-center overflow-y-auto bg-overlay backdrop-blur-[2px] md:p-4 md:pt-24"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className={`w-full ${width} max-h-[92vh] overflow-y-auto rounded-t-3xl md:rounded-2xl bg-surface-container-lowest shadow-modal animate-pop-in`}
      >
        <div className="md:hidden pt-2.5 pb-1 flex justify-center">
          <span className="w-10 h-[5px] rounded-full bg-outline-variant" />
        </div>

        <div className="flex items-center gap-2.5 px-4 md:px-6 py-4 md:py-5 border-b border-outline-soft">
          <h2 className="flex-1 font-display text-lg font-semibold text-on-surface">{title}</h2>
          {headerAside && <span className="text-label-md text-outline">{headerAside}</span>}
          <button
            onClick={onClose}
            className="w-11 h-11 md:w-[30px] md:h-[30px] flex-none flex items-center justify-center rounded-lg text-on-surface-variant hover:bg-surface-container-low transition-colors"
            aria-label="Fermer"
          >
            <CloseOutlined style={{ fontSize: 18 }} />
          </button>
        </div>

        <div className="px-4 md:px-6 py-5 md:py-6">{children}</div>

        {footer && (
          <div className="flex items-center gap-2.5 px-4 md:px-6 py-4 border-t border-outline-soft">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
