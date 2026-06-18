"use client";

import { useState } from "react";
import { SearchOutlined, ExpandMoreOutlined } from "@mui/icons-material";
import { Checkbox } from "./Checkbox";

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

export function PermissionPicker({
  groups,
  selectedIds,
  onToggle,
}: {
  groups: PermissionGroupLike[];
  selectedIds: number[];
  onToggle: (id: number) => void;
}) {
  const [query, setQuery] = useState("");
  const [openKey, setOpenKey] = useState<string | null>(null);

  const normalizedQuery = query.trim().toLowerCase();
  const isSearching = normalizedQuery.length > 0;

  const visibleGroups = groups
    .map((group) => {
      if (!isSearching) return group;

      const groupMatches = group.name.toLowerCase().includes(normalizedQuery);
      const permissions = groupMatches
        ? group.permissions
        : group.permissions.filter(
            (permission) =>
              permission.name.toLowerCase().includes(normalizedQuery) ||
              (permission.description ?? "").toLowerCase().includes(normalizedQuery)
          );

      return { ...group, permissions };
    })
    .filter((group) => group.permissions.length > 0);

  return (
    <div className="space-y-2">
      <div className="relative">
        <SearchOutlined
          style={{ fontSize: 18 }}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant"
        />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Rechercher un groupe ou un droit…"
          className="w-full pl-9 pr-3 py-2 rounded-xl border border-outline-variant bg-surface text-sm text-on-surface"
        />
      </div>

      <div className="rounded-xl border border-outline-variant divide-y divide-outline-variant max-h-72 overflow-y-auto">
        {visibleGroups.length === 0 && (
          <p className="text-sm text-on-surface-variant px-3 py-3">Aucun résultat.</p>
        )}
        {visibleGroups.map((group) => {
          const groupKey = group.key ?? "general";
          const isOpen = isSearching || openKey === groupKey;
          const checkedCount = group.permissions.filter((p) =>
            selectedIds.includes(p.id)
          ).length;

          return (
            <div key={groupKey}>
              <button
                type="button"
                onClick={() => setOpenKey((prev) => (prev === groupKey ? null : groupKey))}
                className="w-full flex items-center justify-between px-3 py-2.5 text-left hover:bg-surface-container transition-colors"
              >
                <span className="text-xs font-semibold text-on-surface-variant uppercase tracking-wide">
                  {group.name}
                  {checkedCount > 0 && (
                    <span className="ml-1.5 text-primary">({checkedCount})</span>
                  )}
                </span>
                <ExpandMoreOutlined
                  style={{ fontSize: 18 }}
                  className={`text-on-surface-variant transition-transform ${
                    isOpen ? "rotate-180" : ""
                  }`}
                />
              </button>
              {isOpen && (
                <div className="px-1 pb-2">
                  {group.permissions.map((permission) => (
                    <Checkbox
                      key={permission.id}
                      checked={selectedIds.includes(permission.id)}
                      onChange={() => onToggle(permission.id)}
                      label={permission.name}
                      description={permission.description ?? undefined}
                    />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
