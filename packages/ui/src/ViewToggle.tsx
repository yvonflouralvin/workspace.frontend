"use client";

import { ReactNode } from "react";

export interface ViewToggleOption<T extends string> {
  key: T;
  label: string;
  icon: ReactNode;
}

interface ViewToggleProps<T extends string> {
  value: T;
  options: ViewToggleOption<T>[];
  onChange: (value: T) => void;
  className?: string;
}

export function ViewToggle<T extends string>({
  value,
  options,
  onChange,
  className = "",
}: ViewToggleProps<T>) {
  return (
    <div
      role="group"
      className={`flex rounded-xl border border-outline-variant overflow-hidden shrink-0 ${className}`}
    >
      {options.map((option) => (
        <button
          key={option.key}
          type="button"
          onClick={() => onChange(option.key)}
          title={option.label}
          aria-label={option.label}
          aria-pressed={option.key === value}
          className={`px-3 py-2 flex items-center transition-colors ${
            option.key === value
              ? "bg-primary text-on-primary"
              : "text-on-surface-variant hover:bg-surface-container"
          }`}
        >
          {option.icon}
        </button>
      ))}
    </div>
  );
}
