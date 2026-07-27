"use client";

import { useState, type KeyboardEvent } from "react";
import { CloseOutlined } from "@mui/icons-material";

/** Champ d'étiquettes : puces supprimables + saisie libre (Entrée ou virgule valide).
 *  En lecture seule, rend les puces sans saisie ni croix. */
export function TagInput({
  value,
  onChange,
  disabled,
  placeholder = "Ajouter une étiquette…",
  suggestions = [],
}: {
  value: string[];
  onChange: (value: string[]) => void;
  disabled?: boolean;
  placeholder?: string;
  /** Étiquettes déjà utilisées ailleurs — proposées à la saisie (datalist). */
  suggestions?: string[];
}) {
  const [draft, setDraft] = useState("");
  const listId = `tags-${suggestions.length}`;

  function add(raw: string) {
    const tag = raw.trim();
    if (!tag || value.includes(tag)) {
      setDraft("");
      return;
    }
    onChange([...value, tag]);
    setDraft("");
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter" || event.key === ",") {
      event.preventDefault();
      add(draft);
    } else if (event.key === "Backspace" && !draft && value.length) {
      onChange(value.slice(0, -1));
    }
  }

  if (disabled && !value.length) {
    return <span className="text-body-sm text-outline">—</span>;
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {value.map((tag) => (
        <span
          key={tag}
          className="inline-flex items-center gap-1 rounded-full bg-surface-container px-2 py-0.5 text-label-md font-medium text-on-surface-variant"
        >
          {tag}
          {!disabled && (
            <button
              type="button"
              onClick={() => onChange(value.filter((t) => t !== tag))}
              aria-label={`Retirer ${tag}`}
              className="text-outline hover:text-error transition-colors"
            >
              <CloseOutlined style={{ fontSize: 13 }} />
            </button>
          )}
        </span>
      ))}
      {!disabled && (
        <>
          <input
            value={draft}
            list={suggestions.length ? listId : undefined}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={onKeyDown}
            onBlur={() => add(draft)}
            placeholder={value.length ? "" : placeholder}
            className="min-w-[8rem] flex-1 bg-transparent text-body-sm text-on-surface outline-none placeholder:text-outline"
          />
          {suggestions.length > 0 && (
            <datalist id={listId}>
              {suggestions.map((tag) => (
                <option key={tag} value={tag} />
              ))}
            </datalist>
          )}
        </>
      )}
    </div>
  );
}
