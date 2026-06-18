"use client";

import { useEffect, useRef, useState } from "react";
import { CloseOutlined, SearchOutlined } from "@mui/icons-material";

interface OptionLike {
  id: string | number;
  label: string;
}

export function MultiSelect({
  options,
  selectedIds,
  onChange,
  placeholder = "Rechercher…",
  emptyLabel = "Aucun résultat.",
}: {
  options: OptionLike[];
  selectedIds: (string | number)[];
  onChange: (ids: (string | number)[]) => void;
  placeholder?: string;
  emptyLabel?: string;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selected = options.filter((option) => selectedIds.includes(option.id));
  const normalizedQuery = query.trim().toLowerCase();
  const availableOptions = options
    .filter((option) => !selectedIds.includes(option.id))
    .filter((option) => option.label.toLowerCase().includes(normalizedQuery));

  function addOption(id: string | number) {
    onChange([...selectedIds, id]);
    setQuery("");
  }

  function removeOption(id: string | number) {
    onChange(selectedIds.filter((existing) => existing !== id));
  }

  return (
    <div ref={containerRef} className="relative">
      <div className="flex flex-wrap items-center gap-1.5 p-2 rounded-xl border border-outline-variant bg-surface min-h-[2.75rem]">
        {selected.map((option) => (
          <span
            key={option.id}
            className="flex items-center gap-1 pl-2.5 pr-1.5 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium"
          >
            {option.label}
            <button
              type="button"
              onClick={() => removeOption(option.id)}
              className="rounded-full p-0.5 hover:bg-primary/20 transition-colors"
            >
              <CloseOutlined style={{ fontSize: 14 }} />
            </button>
          </span>
        ))}
        <div className="flex items-center flex-1 min-w-[8rem] gap-1">
          {selected.length === 0 && (
            <SearchOutlined style={{ fontSize: 16 }} className="text-on-surface-variant" />
          )}
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => setOpen(true)}
            placeholder={placeholder}
            className="w-full px-1 py-1 text-sm text-on-surface bg-transparent outline-none"
          />
        </div>
      </div>

      {open && (
        <div className="absolute z-10 mt-1 w-full max-h-56 overflow-y-auto rounded-xl border border-outline-variant bg-surface-container-lowest shadow-lg">
          {availableOptions.length === 0 && (
            <p className="text-sm text-on-surface-variant px-3 py-2">{emptyLabel}</p>
          )}
          {availableOptions.map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() => addOption(option.id)}
              className="w-full text-left px-3 py-2 text-sm text-on-surface hover:bg-surface-container transition-colors"
            >
              {option.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
