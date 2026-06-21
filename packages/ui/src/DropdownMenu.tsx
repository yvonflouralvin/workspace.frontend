"use client";

import { ReactNode, useEffect, useRef, useState } from "react";
import { ExpandMoreOutlined } from "@mui/icons-material";

export interface DropdownMenuItem {
  key: string;
  label: string;
  icon?: ReactNode;
  onClick: () => void;
  danger?: boolean;
}

export function DropdownMenu({
  label,
  icon,
  items,
}: {
  label: string;
  icon?: ReactNode;
  items: DropdownMenuItem[];
}) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    function onMouseDown(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setIsOpen(false);
    }

    document.addEventListener("mousedown", onMouseDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onMouseDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [isOpen]);

  return (
    <div ref={containerRef} className="relative inline-block">
      <button
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        className="flex items-center gap-2 px-4 py-2 rounded-xl border border-outline-variant text-sm font-medium text-on-surface hover:bg-surface-container transition-colors"
      >
        {icon}
        {label}
        <ExpandMoreOutlined style={{ fontSize: 18 }} />
      </button>

      {isOpen && (
        <div className="absolute right-0 z-10 mt-1 w-56 rounded-xl border border-outline-variant bg-surface-container-lowest shadow-lg py-1">
          {items.map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => {
                setIsOpen(false);
                item.onClick();
              }}
              className={`flex items-center gap-2 w-full text-left px-3 py-2 text-sm transition-colors hover:bg-surface-container ${
                item.danger ? "text-error" : "text-on-surface"
              }`}
            >
              {item.icon}
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
