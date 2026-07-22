"use client";

import { type Categorie } from "@/lib/ventes-api";

export function CategorieMultiSelect({
  cats,
  selected,
  onChange,
  disabled,
}: {
  cats: Categorie[];
  selected: number[];
  onChange: (ids: number[]) => void;
  disabled?: boolean;
}) {
  function toggle(id: number) {
    onChange(selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id]);
  }

  if (cats.length === 0) {
    return (
      <p className="text-body-sm text-on-surface-variant">
        Aucune catégorie définie. Créez-en depuis Produits › Catégories.
      </p>
    );
  }

  return (
    <div className="flex flex-wrap gap-2">
      {cats.map((c) => {
        const on = selected.includes(c.id);
        return (
          <button
            key={c.id}
            type="button"
            disabled={disabled}
            aria-pressed={on}
            onClick={() => toggle(c.id)}
            className={`px-3 py-1.5 rounded-full text-body-sm border transition-colors disabled:opacity-50 ${
              on
                ? "bg-primary text-on-primary border-primary"
                : "border-outline-variant text-on-surface hover:bg-surface-container"
            }`}
          >
            {c.nom}
          </button>
        );
      })}
    </div>
  );
}
