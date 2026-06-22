"use client";

import { useEffect, useState } from "react";
import { SearchOutlined } from "@mui/icons-material";
import { useSearchOptions } from "./hooks/useSearchOptions";

interface SearchSelectProps<T> {
  fetchOptions: (query: string) => Promise<T[]>;
  value: string | number | null;
  onChange: (value: string | number | null, record: T | null) => void;
  getOptionLabel: (record: T) => string;
  getOptionValue?: (record: T) => string | number;
  placeholder?: string;
  // Affiché tant que `value` n'a pas été (ré)assigné via une sélection dans ce
  // composant — pour pré-remplir un champ d'édition sans le record complet
  // disponible côté appelant.
  initialLabel?: string;
  disabled?: boolean;
}

function defaultGetOptionValue(record: unknown): string | number {
  return (record as { id: string | number }).id;
}

export function SearchSelect<T = Record<string, unknown>>({
  fetchOptions,
  value,
  onChange,
  getOptionLabel,
  getOptionValue = defaultGetOptionValue,
  placeholder = "Rechercher…",
  initialLabel,
  disabled = false,
}: SearchSelectProps<T>) {
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const [selectedRecord, setSelectedRecord] = useState<T | null>(null);

  const { items, loading, query, setQuery } = useSearchOptions<T>({
    fetchOptions,
    enabled: !disabled,
  });

  useEffect(() => {
    if (value === null) setSelectedRecord(null);
  }, [value]);

  function handleSelect(record: T) {
    setSelectedRecord(record);
    onChange(getOptionValue(record), record);
    setIsOpen(false);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Escape") {
      setIsOpen(false);
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightedIndex((i) => Math.min(i + 1, items.length - 1));
      return;
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightedIndex((i) => Math.max(i - 1, 0));
      return;
    }
    if (e.key === "Enter") {
      e.preventDefault();
      const record = items[highlightedIndex];
      if (record) handleSelect(record);
    }
  }

  const displayValue = isOpen
    ? query
    : selectedRecord
      ? getOptionLabel(selectedRecord)
      : value !== null && initialLabel
        ? initialLabel
        : "";

  return (
    <div className="relative">
      <div className="relative">
        <SearchOutlined
          style={{ fontSize: 18 }}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant"
        />
        <input
          type="text"
          disabled={disabled}
          value={displayValue}
          onFocus={() => {
            setIsOpen(true);
            setQuery("");
            setHighlightedIndex(0);
          }}
          onChange={(e) => {
            setQuery(e.target.value);
            setHighlightedIndex(0);
          }}
          onKeyDown={handleKeyDown}
          onBlur={() => setTimeout(() => setIsOpen(false), 100)}
          placeholder={placeholder}
          className="w-full pl-9 pr-3 py-2 rounded-xl border border-outline-variant bg-surface text-sm text-on-surface disabled:opacity-50"
        />
      </div>

      {isOpen && (
        <div className="absolute z-10 mt-1 w-full max-h-60 overflow-y-auto rounded-xl border border-outline-variant bg-surface-container-lowest shadow-lg">
          {loading && (
            <div className="px-3 py-2 text-sm text-on-surface-variant">Chargement…</div>
          )}
          {!loading && items.length === 0 && (
            <div className="px-3 py-2 text-sm text-on-surface-variant">Aucun résultat.</div>
          )}
          {!loading &&
            items.map((record, i) => (
              <button
                key={getOptionValue(record)}
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => handleSelect(record)}
                className={`w-full text-left px-3 py-2 text-sm text-on-surface transition-colors ${
                  i === highlightedIndex ? "bg-surface-container" : "hover:bg-surface-container"
                }`}
              >
                {getOptionLabel(record)}
              </button>
            ))}
        </div>
      )}
    </div>
  );
}
