"use client";

import { useEffect } from "react";
import { CloseOutlined } from "@mui/icons-material";

export function RightDrawer({
  title,
  onClose,
  children,
  // Valeur arbitraire, même raison que Modal.width : les tokens nommés
  // (sm/md/lg/xl) collisionnent avec l'échelle max-w-*.
  width = "max-w-md",
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
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40">
      <div
        className={`w-full ${width} h-full flex flex-col bg-surface-container-lowest border-l border-outline-variant shadow-lg`}
      >
        <div className="shrink-0 flex items-center justify-between px-6 py-4 border-b border-outline-variant">
          <h2 className="text-base font-semibold text-on-surface">{title}</h2>
          <button
            onClick={onClose}
            className="text-on-surface-variant hover:text-on-surface transition-colors"
          >
            <CloseOutlined style={{ fontSize: 20 }} />
          </button>
        </div>
        <div className="flex-1 min-h-0 flex flex-col px-6 py-5">{children}</div>
      </div>
    </div>
  );
}
