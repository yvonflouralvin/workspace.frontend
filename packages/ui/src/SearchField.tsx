"use client";

import { SearchOutlined } from "@mui/icons-material";

export interface SearchFieldProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  /** Largeur en classes utilitaires — pleine largeur par défaut. */
  className?: string;
  autoFocus?: boolean;
}

export function SearchField({
  value,
  onChange,
  placeholder = "Rechercher…",
  className = "w-full",
  autoFocus,
}: SearchFieldProps) {
  return (
    <div
      className={`flex items-center gap-2 h-[38px] px-3 rounded-lg bg-surface-container-lowest border border-outline-soft text-outline focus-within:border-primary transition-colors ${className}`}
    >
      <SearchOutlined style={{ fontSize: 15 }} className="flex-none" />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoFocus={autoFocus}
        className="w-full bg-transparent border-none outline-none text-body-sm text-on-surface placeholder:text-outline"
      />
    </div>
  );
}
