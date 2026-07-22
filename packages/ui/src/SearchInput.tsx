"use client";

import { useEffect, useRef, useState } from "react";
import { SearchOutlined, CloseOutlined } from "@mui/icons-material";

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  debounceMs?: number;
  className?: string;
  autoFocus?: boolean;
}

export function SearchInput({
  value,
  onChange,
  placeholder = "Rechercher…",
  debounceMs = 300,
  className = "",
  autoFocus = false,
}: SearchInputProps) {
  const [draft, setDraft] = useState(value);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const emitted = useRef(value);

  // Resynchronise si le parent réinitialise la valeur (ex: bouton « effacer les filtres »),
  // sans écraser la frappe en cours dont l'émission est encore en attente.
  useEffect(() => {
    if (value !== emitted.current) {
      emitted.current = value;
      setDraft(value);
    }
  }, [value]);

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  function emit(next: string) {
    emitted.current = next;
    onChange(next);
  }

  function handleChange(next: string) {
    setDraft(next);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => emit(next), debounceMs);
  }

  function clear() {
    if (timer.current) clearTimeout(timer.current);
    setDraft("");
    emit("");
  }

  return (
    <div className={`relative ${className}`}>
      <SearchOutlined
        style={{ fontSize: 18 }}
        className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant pointer-events-none"
      />
      <input
        type="text"
        value={draft}
        autoFocus={autoFocus}
        onChange={(e) => handleChange(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Escape" && draft) clear(); }}
        placeholder={placeholder}
        className="w-full pl-9 pr-9 py-2 rounded-xl border border-outline-variant bg-surface-container-lowest text-body-md text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:border-primary transition-colors"
      />
      {draft && (
        <button
          type="button"
          onClick={clear}
          aria-label="Effacer la recherche"
          className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-full text-on-surface-variant hover:bg-surface-container transition-colors"
        >
          <CloseOutlined style={{ fontSize: 16 }} />
        </button>
      )}
    </div>
  );
}
