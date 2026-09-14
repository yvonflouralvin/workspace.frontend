"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { HelpOutlineOutlined, CloseOutlined } from "@mui/icons-material";

interface AideFlottanteProps {
  titre: string;
  children: React.ReactNode;
}

export function AideFlottante({ titre, children }: AideFlottanteProps) {
  const [ouvert, setOuvert] = useState(false);
  const [monte, setMonte] = useState(false);

  useEffect(() => setMonte(true), []);

  useEffect(() => {
    if (!ouvert) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOuvert(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [ouvert]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOuvert(true)}
        aria-label="Aide sur cet écran"
        className="fixed bottom-5 right-5 z-40 flex h-11 w-11 items-center justify-center rounded-full bg-primary text-on-primary shadow-modal hover:bg-primary-container transition-colors"
      >
        <HelpOutlineOutlined style={{ fontSize: 22 }} />
      </button>

      {monte && ouvert &&
        createPortal(
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-overlay p-4 animate-overlay-in"
            onClick={() => setOuvert(false)}
          >
            <div
              className="w-full max-w-[560px] max-h-[80vh] overflow-y-auto rounded-2xl bg-surface-container-lowest shadow-modal animate-pop-in"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="sticky top-0 flex items-center justify-between gap-3 border-b border-hairline bg-surface-container-lowest px-5 py-4">
                <h2 className="font-display text-headline-sm text-on-surface">{titre}</h2>
                <button
                  type="button"
                  onClick={() => setOuvert(false)}
                  aria-label="Fermer"
                  className="flex h-8 w-8 items-center justify-center rounded-full text-on-surface-variant hover:bg-surface-container-low transition-colors"
                >
                  <CloseOutlined style={{ fontSize: 18 }} />
                </button>
              </div>
              <div className="px-5 py-4 space-y-3 text-body-md text-on-surface-variant leading-relaxed">
                {children}
              </div>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
