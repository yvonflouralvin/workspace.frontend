"use client";

import { useEffect } from "react";
import { CloseOutlined } from "@mui/icons-material";

export function Modal({
  title,
  onClose,
  children,
  // Valeur arbitraire : les tokens nommés (sm/md/lg/xl) sont redéfinis par
  // --spacing-* dans le thème et collisionnent avec l'échelle max-w-*.
  width = "max-w-[28rem]",
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div
        className={`w-full ${width} rounded-2xl bg-surface-container-lowest border border-outline-variant shadow-lg`}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-outline-variant">
          <h2 className="text-base font-semibold text-on-surface">{title}</h2>
          <button
            onClick={onClose}
            className="text-on-surface-variant hover:text-on-surface transition-colors"
          >
            <CloseOutlined style={{ fontSize: 20 }} />
          </button>
        </div>
        <div className="px-6 py-5">{children}</div>
      </div>
    </div>
  );
}
