"use client";

import { useCallback, useEffect, useState } from "react";
import { CloseOutlined } from "@mui/icons-material";

export function RightDrawer({
  title,
  onClose,
  children,
  footer,
  // Valeur arbitraire : les tokens --spacing-* écrasent l'échelle max-w-*.
  width = "w-[600px] max-w-[92vw]",
  contentClassName = "px-5 py-5",
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  /** Barre d'actions collée en bas du panneau. */
  footer?: React.ReactNode;
  width?: string;
  contentClassName?: string;
}) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const raf = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(raf);
  }, []);

  const handleClose = useCallback(() => {
    setVisible(false);
    setTimeout(onClose, 300);
  }, [onClose]);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") handleClose();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [handleClose]);

  return (
    <div
      className={`fixed inset-0 z-50 flex justify-end transition-colors duration-300 ${
        visible ? "bg-overlay" : "bg-transparent"
      }`}
      onClick={(e) => {
        if (e.target === e.currentTarget) handleClose();
      }}
    >
      <div
        className={`${width} h-full flex flex-col bg-surface-container-lowest shadow-drawer transition-transform duration-300 ease-out ${
          visible ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="shrink-0 flex items-center gap-2.5 px-5 py-4 border-b border-outline-soft">
          <h2 className="flex-1 min-w-0 font-display text-base font-semibold text-on-surface truncate">
            {title}
          </h2>
          <button
            onClick={handleClose}
            className="w-[30px] h-[30px] flex-none flex items-center justify-center rounded-lg text-on-surface-variant hover:bg-surface-container-low transition-colors"
            aria-label="Fermer"
          >
            <CloseOutlined style={{ fontSize: 17 }} />
          </button>
        </div>

        <div className={`flex-1 min-h-0 overflow-y-auto ${contentClassName}`}>{children}</div>

        {footer && (
          <div className="shrink-0 flex flex-wrap items-center gap-2 px-5 py-3.5 border-t border-outline-soft">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
