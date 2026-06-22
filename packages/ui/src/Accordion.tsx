"use client";

import { useState } from "react";
import { ExpandMoreOutlined } from "@mui/icons-material";

export function Accordion({
  title,
  badge,
  defaultOpen = false,
  children,
}: {
  title: string;
  badge?: React.ReactNode;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="rounded-xl border border-outline-variant overflow-hidden">
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-surface-container transition-colors"
      >
        <span className="text-sm font-semibold text-on-surface">
          {title}
          {badge !== undefined && (
            <span className="ml-1.5 text-on-surface-variant">{badge}</span>
          )}
        </span>
        <ExpandMoreOutlined
          style={{ fontSize: 20 }}
          className={`text-on-surface-variant transition-transform ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>
      {isOpen && <div className="border-t border-outline-variant">{children}</div>}
    </div>
  );
}
