"use client";

import { useCallback, useEffect, useState } from "react";
import { CloseOutlined } from "@mui/icons-material";

export function LeftDrawer({
  title,
  onClose,
  children,
  width = "w-[600px] max-w-full",
  contentClassName = "px-6 py-5",
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
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
      className={`fixed inset-0 z-50 flex justify-start backdrop-blur-sm transition-[background-color] duration-300 ${
        visible ? "bg-black/40" : "bg-black/0"
      }`}
      onClick={(e) => { if (e.target === e.currentTarget) handleClose(); }}
    >
      <div
        className={`${width} h-full flex flex-col bg-surface-container-lowest border-r border-outline-variant shadow-2xl transition-transform duration-300 ease-out ${
          visible ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="shrink-0 flex items-center justify-between px-6 py-4 border-b border-outline-variant">
          <h2 className="text-base font-semibold text-on-surface">{title}</h2>
          <button
            onClick={handleClose}
            className="text-on-surface-variant hover:text-on-surface transition-colors"
          >
            <CloseOutlined style={{ fontSize: 20 }} />
          </button>
        </div>
        <div className={`flex-1 min-h-0 overflow-hidden ${contentClassName}`}>{children}</div>
      </div>
    </div>
  );
}
