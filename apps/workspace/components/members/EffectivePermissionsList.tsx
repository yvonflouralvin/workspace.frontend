"use client";

import type { EffectivePermissionApp } from "@/app/lib/members";

export function EffectivePermissionsList({ apps }: { apps: EffectivePermissionApp[] }) {
  if (apps.length === 0) {
    return (
      <p className="rounded-xl border border-outline-soft px-3 py-4 text-body-sm text-on-surface-variant">
        Aucune permission.
      </p>
    );
  }

  return (
    <div className="rounded-xl border border-outline-soft overflow-hidden">
      {apps.map((app) => (
        <div key={app.app} className="border-b border-hairline last:border-b-0">
          <p className="px-3 py-2.5 bg-surface-row-alt text-label-sm uppercase text-on-surface-variant">
            {app.app}
          </p>
          {app.permissions.map((permission) => (
            <div
              key={permission.key}
              className="flex items-center gap-2.5 px-3 py-2.5 border-t border-hairline-soft text-body-sm"
              title={permission.key}
            >
              <span
                className={`w-1.5 h-1.5 flex-none rounded-sm ${
                  permission.fromGroup ? "bg-outline-variant" : "bg-primary"
                }`}
              />
              <span className="flex-1 min-w-0 truncate text-on-surface">{permission.label}</span>
              <span
                className={`flex-none text-[11px] font-semibold rounded-md px-2 py-0.5 ${
                  permission.fromGroup
                    ? "bg-role-member-container text-role-member"
                    : "bg-role-owner-container text-role-owner"
                }`}
              >
                {permission.fromGroup ?? "Direct"}
              </span>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

export function PermissionSourceLegend() {
  return (
    <div className="flex gap-2.5 text-[11px] text-outline">
      <span className="inline-flex items-center gap-1">
        <span className="w-2 h-2 rounded-sm bg-primary" />
        Direct
      </span>
      <span className="inline-flex items-center gap-1">
        <span className="w-2 h-2 rounded-sm bg-outline-variant" />
        Hérité
      </span>
    </div>
  );
}
