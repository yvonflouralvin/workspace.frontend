"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { SearchOutlined, AddOutlined } from "@mui/icons-material";
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
  // Si fourni, quand aucun résultat ne correspond à la recherche, une action
  // « créer » est proposée dans le dropdown avec le texte saisi.
  onCreate?: (query: string) => void | Promise<void>;
  createLabel?: (query: string) => string;
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
  onCreate,
  createLabel,
}: SearchSelectProps<T>) {
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const [selectedRecord, setSelectedRecord] = useState<T | null>(null);
  const anchorRef = useRef<HTMLDivElement>(null);
  const [menuRect, setMenuRect] = useState<{ top: number; left: number; width: number } | null>(null);

  const { items, loading, query, setQuery } = useSearchOptions<T>({
    fetchOptions,
    enabled: !disabled,
  });

  useEffect(() => {
    if (value === null) setSelectedRecord(null);
  }, [value]);

  // Le menu est portalisé sur <body> pour échapper à tout ancêtre `overflow-hidden`
  // (cartes, drawers) qui le tronquerait ; on le repositionne sur l'ancre à
  // l'ouverture, au scroll et au redimensionnement.
  useLayoutEffect(() => {
    if (!isOpen) return;
    const place = () => {
      const el = anchorRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      setMenuRect({ top: r.bottom + 4, left: r.left, width: r.width });
    };
    place();
    window.addEventListener("scroll", place, true);
    window.addEventListener("resize", place);
    return () => {
      window.removeEventListener("scroll", place, true);
      window.removeEventListener("resize", place);
    };
  }, [isOpen]);

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

  const menu = isOpen && menuRect && (
    <div
      style={{
        position: "fixed",
        top: menuRect.top,
        left: menuRect.left,
        width: menuRect.width,
      }}
      className="z-50 max-h-60 overflow-y-auto rounded-xl border border-outline-variant bg-surface-container-lowest shadow-lg"
    >
      {loading && (
        <div className="px-3 py-2 text-sm text-on-surface-variant">Chargement…</div>
      )}
      {!loading && items.length === 0 &&
        (onCreate && query.trim() ? (
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => {
              setIsOpen(false);
              onCreate(query.trim());
            }}
            className="w-full text-left px-3 py-2 text-sm text-primary hover:bg-surface-container transition-colors flex items-center gap-2"
          >
            <AddOutlined style={{ fontSize: 16 }} />
            {createLabel ? createLabel(query.trim()) : `Créer « ${query.trim()} »`}
          </button>
        ) : (
          <div className="px-3 py-2 text-sm text-on-surface-variant">Aucun résultat.</div>
        ))}
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
  );

  return (
    <div className="relative" ref={anchorRef}>
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

      {typeof document !== "undefined" && menu ? createPortal(menu, document.body) : null}
    </div>
  );
}
