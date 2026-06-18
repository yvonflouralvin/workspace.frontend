"use client";

import { useState, useRef, useEffect } from "react";
import { CheckOutlined, ExpandMoreOutlined, AddOutlined } from "@mui/icons-material";
import Link from "next/link";
import { useSessionStore } from "@repo/auth/store/session.store";

const COLORS = ["#3525cd", "#006c49", "#004598", "#b91c1c", "#a16207", "#7c3aed"];
const WORKSPACE_DOMAIN = process.env.NEXT_PUBLIC_WORKSPACE_DOMAIN ?? "http://localhost:3005";

function workspaceColor(id: number): string {
  return COLORS[id % COLORS.length] ?? "#3525cd";
}

export function WorkspaceSwitcher({
  filterPermission,
}: {
  filterPermission?: string;
}) {
  const { activeWorkspace, workspaces, switchWorkspace } = useSessionStore();
  const [open, setOpen] = useState(false);
  const [switching, setSwitching] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onMouseDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onMouseDown);
    return () => document.removeEventListener("mousedown", onMouseDown);
  }, []);

  const handleSwitch = async (workspaceId: number) => {
    if (workspaceId === activeWorkspace?.id || switching) return;
    setSwitching(true);
    setOpen(false);
    try {
      await switchWorkspace(workspaceId);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Impossible de changer de workspace.");
      setSwitching(false);
    }
  };

  if (!activeWorkspace) return null;

  const color = workspaceColor(activeWorkspace.id);
  const initial = activeWorkspace.name[0]?.toUpperCase() ?? "W";

  const restricted = !activeWorkspace.is_owner && activeWorkspace.restrict_members_to_workspace;

  if (restricted) {
    return (
      <div className="w-full flex items-center gap-2.5 px-2 py-2 rounded-xl">
        <span
          className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
          style={{ backgroundColor: color }}
        >
          {initial}
        </span>
        <span className="flex-1 text-sm font-semibold text-on-surface text-left truncate">
          {activeWorkspace.name}
        </span>
      </div>
    );
  }

  const visibleWorkspaces = filterPermission
    ? workspaces.filter((ws) => ws.permissions.includes(filterPermission))
    : workspaces;

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-2.5 px-2 py-2 rounded-xl hover:bg-surface-container transition-colors"
      >
        <span
          className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
          style={{ backgroundColor: color }}
        >
          {initial}
        </span>
        <span className="flex-1 text-sm font-semibold text-on-surface text-left truncate">
          {activeWorkspace.name}
        </span>
        <ExpandMoreOutlined
          style={{ fontSize: 18 }}
          className={`text-on-surface-variant transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div className="absolute left-0 right-0 top-full mt-1 bg-surface-container-lowest border border-outline-variant rounded-2xl shadow-lg overflow-hidden z-50">
          <div className="p-1.5">
            <p className="px-3 py-1.5 text-xs font-semibold text-on-surface-variant uppercase tracking-wider">
              Workspaces
            </p>
            {visibleWorkspaces.map((ws) => (
              <button
                key={ws.id}
                disabled={switching}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-surface-container transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={() => handleSwitch(ws.id)}
              >
                <span
                  className="w-6 h-6 rounded-lg flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                  style={{ backgroundColor: workspaceColor(ws.id) }}
                >
                  {ws.name[0]?.toUpperCase() ?? "W"}
                </span>
                <span className="flex-1 text-sm text-on-surface text-left truncate">
                  {ws.name}
                </span>
                {ws.id === activeWorkspace.id && (
                  <CheckOutlined style={{ fontSize: 16 }} className="text-primary" />
                )}
              </button>
            ))}
          </div>
          <div className="border-t border-outline-variant p-1.5">
            <Link
              href={`${WORKSPACE_DOMAIN}/onboarding/new-workspace`}
              onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm text-on-surface-variant hover:bg-surface-container transition-colors"
            >
              <AddOutlined style={{ fontSize: 18 }} />
              Créer un workspace
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
