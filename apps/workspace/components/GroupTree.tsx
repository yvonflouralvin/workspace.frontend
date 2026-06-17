"use client";

import { AddOutlined, LockOutlined } from "@mui/icons-material";
import type { Group } from "@/app/lib/types";

function buildChildren(groups: Group[], parentId: number | null): Group[] {
  return groups.filter((g) => g.parent_id === parentId);
}

function GroupNode({
  group,
  groups,
  selectedId,
  onSelect,
  onAddSubgroup,
  depth,
}: {
  group: Group;
  groups: Group[];
  selectedId: number | null;
  onSelect: (group: Group) => void;
  onAddSubgroup: (parent: Group) => void;
  depth: number;
}) {
  const children = buildChildren(groups, group.id);

  return (
    <div>
      <div
        className={`flex items-center gap-2 px-3 py-2 rounded-xl cursor-pointer transition-colors ${
          selectedId === group.id ? "bg-primary/10" : "hover:bg-surface-container"
        }`}
        style={{ paddingLeft: 12 + depth * 20 }}
        onClick={() => onSelect(group)}
      >
        {group.is_system && (
          <LockOutlined style={{ fontSize: 14 }} className="text-on-surface-variant" />
        )}
        <span className="flex-1 text-sm text-on-surface truncate">{group.name}</span>
        <span className="text-xs text-on-surface-variant">{group.member_count}</span>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onAddSubgroup(group);
          }}
          className="text-on-surface-variant hover:text-primary transition-colors"
          title="Ajouter un sous-groupe"
        >
          <AddOutlined style={{ fontSize: 16 }} />
        </button>
      </div>
      {children.map((child) => (
        <GroupNode
          key={child.id}
          group={child}
          groups={groups}
          selectedId={selectedId}
          onSelect={onSelect}
          onAddSubgroup={onAddSubgroup}
          depth={depth + 1}
        />
      ))}
    </div>
  );
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
  const roots = buildChildren(groups, null);

  return (
    <div className="space-y-0.5">
      {roots.map((group) => (
        <GroupNode
          key={group.id}
          group={group}
          groups={groups}
          selectedId={selectedId}
          onSelect={onSelect}
          onAddSubgroup={onAddSubgroup}
          depth={0}
        />
      ))}
    </div>
  );
}
