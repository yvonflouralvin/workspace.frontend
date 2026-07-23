"use client";

import { CloseOutlined, FilterListOutlined } from "@mui/icons-material";

export interface ActiveFilter {
  key: string;
  label: string;
  onClear: () => void;
}

/**
 * Résumé des filtres actifs + réinitialisation. Corrige le défaut systémique
 * des listes de la plateforme : des contrôles posés au-dessus d'un tableau sans
 * jamais rappeler ce qui est effectivement filtré.
 */
export function ActiveFilters({
  filters,
  onClearAll,
}: {
  filters: ActiveFilter[];
  onClearAll: () => void;
}) {
  if (filters.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="inline-flex items-center gap-1.5 text-label-md text-outline">
        <FilterListOutlined style={{ fontSize: 15 }} />
        Filtres actifs
      </span>
      {filters.map((f) => (
        <button
          key={f.key}
          type="button"
          onClick={f.onClear}
          className="inline-flex items-center gap-1 rounded-md bg-surface-container px-2 py-1 text-label-md font-medium text-on-surface-variant hover:bg-surface-container-high transition-colors"
        >
          {f.label}
          <CloseOutlined style={{ fontSize: 13 }} />
        </button>
      ))}
      <button
        type="button"
        onClick={onClearAll}
        className="text-label-md font-semibold text-primary hover:underline"
      >
        Tout réinitialiser
      </button>
    </div>
  );
}
