"use client";

import { useMemo, useState } from "react";
import {
  AddOutlined,
  ExpandMoreOutlined,
  KeyboardArrowRightOutlined,
  LockOutlined,
} from "@mui/icons-material";
import { SearchField } from "@repo/ui/SearchField";
import type { Group } from "@/app/lib/types";

interface Row {
  group: Group;
  depth: number;
  hasChildren: boolean;
}

/** Aplatit l'arborescence en respectant les nœuds repliés. */
function flatten(
  groups: Group[],
  parentId: number | null,
  depth: number,
  collapsed: Set<number>,
  out: Row[]
) {
  for (const group of groups.filter((g) => g.parent_id === parentId)) {
    const hasChildren = groups.some((g) => g.parent_id === group.id);
    out.push({ group, depth, hasChildren });
    if (hasChildren && !collapsed.has(group.id)) {
      flatten(groups, group.id, depth + 1, collapsed, out);
    }
  }
}

export function GroupTree({
  groups,
  selectedId,
  onSelect,
  onAddSubgroup,
}: {
  groups: Group[];
  selectedId: number | null;
  onSelect: (group: Group) => void;
  onAddSubgroup: (parent: Group) => void;
}) {
  const [collapsed, setCollapsed] = useState<Set<number>>(new Set());
  const [query, setQuery] = useState("");

  const normalized = query.trim().toLowerCase();

  const rows = useMemo(() => {
    // Pendant une recherche, la hiérarchie s'efface : on liste les résultats à plat.
    if (normalized) {
      return groups
        .filter((g) => g.name.toLowerCase().includes(normalized))
        .map((group) => ({
          group,
          depth: 0,
          hasChildren: groups.some((g) => g.parent_id === group.id),
        }));
    }
    const out: Row[] = [];
    flatten(groups, null, 0, collapsed, out);
    return out;
  }, [groups, collapsed, normalized]);

  function toggle(id: number) {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <div className="rounded-2xl border border-outline-soft bg-surface-container-lowest p-3">
      <SearchField
        value={query}
        onChange={setQuery}
        placeholder="Rechercher un groupe…"
        className="w-full mb-2"
      />

      {rows.length === 0 ? (
        <p className="px-2.5 py-3 text-body-sm text-on-surface-variant">Aucun groupe.</p>
      ) : (
        rows.map(({ group, depth, hasChildren }) => {
          const active = selectedId === group.id;
          return (
            <div
              key={group.id}
              onClick={() => onSelect(group)}
              style={{ marginLeft: depth * 20 }}
              className={`group flex items-center gap-1.5 px-2.5 py-2 rounded-lg cursor-pointer transition-colors ${
                active ? "bg-primary/10" : "hover:bg-surface-container-low"
              }`}
            >
              <span
                onClick={(e) => {
                  e.stopPropagation();
                  if (hasChildren && !normalized) toggle(group.id);
                }}
                className="w-4 h-4 flex-none inline-flex items-center justify-center text-outline"
              >
                {hasChildren && !normalized ? (
                  collapsed.has(group.id) ? (
                    <KeyboardArrowRightOutlined style={{ fontSize: 14 }} />
                  ) : (
                    <ExpandMoreOutlined style={{ fontSize: 14 }} />
                  )
                ) : (
                  <span className="w-1.5 h-1.5 rounded-full bg-outline-variant" />
                )}
              </span>

              {group.is_system && (
                <LockOutlined style={{ fontSize: 13 }} className="flex-none text-outline" />
              )}

              <span
                className={`flex-1 min-w-0 truncate text-body-sm ${
                  active ? "font-semibold text-primary" : "font-medium text-on-surface"
                }`}
              >
                {group.name}
              </span>

              <span className="text-label-md text-outline">{group.member_count}</span>

              <button
                type="button"
                title="Ajouter un sous-groupe"
                aria-label={`Ajouter un sous-groupe à ${group.name}`}
                onClick={(e) => {
                  e.stopPropagation();
                  onAddSubgroup(group);
                }}
                className="w-[22px] h-[22px] flex-none inline-flex items-center justify-center rounded-md text-outline hover:bg-surface-container hover:text-primary transition-colors"
              >
                <AddOutlined style={{ fontSize: 13 }} />
              </button>
            </div>
          );
        })
      )}
    </div>
  );
}
