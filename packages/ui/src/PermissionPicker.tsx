"use client";

import { useState } from "react";
import { Checkbox } from "./Checkbox";
import { SearchField } from "./SearchField";

interface PermissionDefLike {
  id: number;
  name: string;
  description: string | null;
}

interface PermissionGroupLike {
  id: number | null;
  key: string | null;
  name: string;
  permissions: PermissionDefLike[];
}

/**
 * Liste de droits à cocher, groupée par application : un bandeau par app puis
 * une ligne par droit. Le libellé lisible vient de `description` ; la clé
 * technique reste accessible en `title`.
 */
export function PermissionPicker({
  groups,
  selectedIds,
  onToggle,
  maxHeight = "max-h-72",
}: {
  groups: PermissionGroupLike[];
  selectedIds: number[];
  onToggle: (id: number) => void;
  maxHeight?: string;
}) {
  const [query, setQuery] = useState("");

  const normalized = query.trim().toLowerCase();
  const visibleGroups = groups
    .map((group) => {
      if (!normalized) return group;
      if (group.name.toLowerCase().includes(normalized)) return group;
      return {
        ...group,
        permissions: group.permissions.filter(
          (p) =>
            p.name.toLowerCase().includes(normalized) ||
            (p.description ?? "").toLowerCase().includes(normalized)
        ),
      };
    })
    .filter((group) => group.permissions.length > 0);

  return (
    <div className="space-y-2">
      <SearchField
        value={query}
        onChange={setQuery}
        placeholder="Rechercher un droit…"
      />

      <div className={`rounded-xl border border-outline-soft overflow-hidden overflow-y-auto ${maxHeight}`}>
        {visibleGroups.length === 0 && (
          <p className="px-3.5 py-3 text-body-sm text-on-surface-variant">Aucun résultat.</p>
        )}
        {visibleGroups.map((group) => {
          const checkedCount = group.permissions.filter((p) => selectedIds.includes(p.id)).length;
          return (
            <div key={group.key ?? "general"} className="border-b border-hairline last:border-b-0">
              <p className="px-3.5 py-2.5 bg-surface-row-alt text-label-sm uppercase text-on-surface-variant">
                {group.name}
                {checkedCount > 0 && <span className="ml-1.5 text-primary">({checkedCount})</span>}
              </p>
              {group.permissions.map((permission) => (
                <div
                  key={permission.id}
                  title={permission.name}
                  className="px-3.5 border-t border-hairline-soft"
                >
                  <Checkbox
                    checked={selectedIds.includes(permission.id)}
                    onChange={() => onToggle(permission.id)}
                    label={permission.description ?? permission.name}
                  />
                </div>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}
