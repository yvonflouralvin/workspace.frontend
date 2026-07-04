"use client";
import { useCallback, useEffect, useState } from "react";
import { CloseOutlined } from "@mui/icons-material";

export function SplitWorkspace({
  title,
  onClose,
  left,
  right,
}: {
  title: string;
  onClose: () => void;
  left: React.ReactNode;
  right: React.ReactNode;
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
      className={`fixed inset-0 z-50 flex flex-col bg-background transition-[opacity,transform] duration-300 ease-out ${
        visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
      }`}
    >
      {/* Header */}
      <div className="shrink-0 flex items-center justify-between px-6 py-3.5 border-b border-outline-variant bg-surface-container-lowest shadow-sm">
        <h2 className="text-body-md font-semibold text-on-surface">{title}</h2>
        <button
          onClick={handleClose}
          className="text-on-surface-variant hover:text-on-surface transition-colors p-1 rounded-lg hover:bg-surface-container"
        >
          <CloseOutlined style={{ fontSize: 20 }} />
        </button>
      </div>

      {/* Split body */}
      <div className="flex flex-1 min-h-0">
        {/* Left — 60% — EMR read-only */}
        <div className="flex flex-col border-r border-outline-variant bg-surface-container-low/20" style={{ width: "60%" }}>
          {left}
        </div>
        {/* Right — 40% — form */}
        <div className="flex flex-col bg-surface-container-lowest" style={{ width: "40%" }}>
          {right}
        </div>
      </div>
    </div>
  );
}
