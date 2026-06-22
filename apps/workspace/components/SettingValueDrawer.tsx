"use client";

import { useState } from "react";
import { RightDrawer } from "@repo/ui/RightDrawer";
import { MultiSelect } from "@repo/ui/MultiSelect";
import { updateWorkspaceSettings, ApiError } from "@/app/lib/api";
import type { AppSettingGroup, SettingDef } from "@/app/lib/types";

export function SettingValueDrawer({
  workspaceId,
  setting,
  onClose,
  onSaved,
}: {
  workspaceId: number;
  setting: SettingDef;
  onClose: () => void;
  onSaved: (groups: AppSettingGroup[]) => void;
}) {
  const [value, setValue] = useState<unknown>(setting.value);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      const res = await updateWorkspaceSettings(workspaceId, [
        { app_setting_id: setting.id, value: value ?? null },
      ]);
      onSaved(res.groups);
      onClose();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Une erreur est survenue");
    } finally {
      setSaving(false);
    }
  }

  return (
    <RightDrawer title={setting.name} onClose={onClose}>
      <div className="space-y-4">
        {setting.description && (
          <p className="text-sm text-on-surface-variant">{setting.description}</p>
        )}

        {setting.type === "text" && (
          <input
            type="text"
            value={typeof value === "string" ? value : ""}
            onChange={(e) => setValue(e.target.value)}
            className="w-full px-3 py-2 rounded-xl border border-outline-variant bg-surface text-sm text-on-surface"
          />
        )}

        {setting.type === "date" && (
          <input
            type="date"
            value={typeof value === "string" ? value : ""}
            onChange={(e) => setValue(e.target.value)}
            className="w-full px-3 py-2 rounded-xl border border-outline-variant bg-surface text-sm text-on-surface"
          />
        )}

        {setting.type === "single_choice" && (
          <select
            value={typeof value === "string" ? value : ""}
            onChange={(e) => setValue(e.target.value || null)}
            className="w-full px-3 py-2 rounded-xl border border-outline-variant bg-surface text-sm text-on-surface"
          >
            <option value="">—</option>
            {(setting.options ?? []).map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        )}

        {setting.type === "multi_choice" && (
          <MultiSelect
            options={(setting.options ?? []).map((o) => ({ id: o.value, label: o.label }))}
            selectedIds={Array.isArray(value) ? (value as string[]) : []}
            onChange={setValue}
          />
        )}

        {error && (
          <p className="text-sm text-error bg-error-container/40 rounded-lg px-3 py-2">{error}</p>
        )}

        <button
          onClick={handleSave}
          disabled={saving}
          className="px-4 py-2 rounded-xl bg-primary text-on-primary text-sm font-medium disabled:opacity-50"
        >
          {saving ? "Enregistrement…" : "Enregistrer"}
        </button>
      </div>
    </RightDrawer>
  );
}
