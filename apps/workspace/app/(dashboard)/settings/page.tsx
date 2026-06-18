"use client";

import { useEffect, useMemo, useState } from "react";
import { SearchOutlined } from "@mui/icons-material";
import { useSessionStore } from "@repo/auth/store/session.store";
import { usePermissions } from "@repo/auth/hooks/usePermissions";
import { MultiSelect } from "@repo/ui/MultiSelect";
import { listWorkspaceSettings, updateWorkspaceSettings, ApiError } from "@/app/lib/api";
import type { AppSettingGroup, SettingDef } from "@/app/lib/types";

export default function SettingsPage() {
  const activeWorkspace = useSessionStore((s) => s.activeWorkspace);
  const { can } = usePermissions();

  const [groups, setGroups] = useState<AppSettingGroup[]>([]);
  const [values, setValues] = useState<Record<number, unknown>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [selectedKey, setSelectedKey] = useState<string>("general");

  const workspaceId = activeWorkspace?.id;
  const canManage = can("workspace.settings.manage");

  useEffect(() => {
    if (!workspaceId || !canManage) {
      setLoading(false);
      return;
    }

    listWorkspaceSettings(workspaceId)
      .then((res) => {
        setGroups(res.groups);
        const initialValues: Record<number, unknown> = {};
        for (const group of res.groups) {
          for (const setting of group.settings) {
            initialValues[setting.id] = setting.value;
          }
        }
        setValues(initialValues);
      })
      .catch((err) => {
        setError(err instanceof ApiError ? err.message : "Une erreur est survenue");
      })
      .finally(() => setLoading(false));
  }, [workspaceId, canManage]);

  const normalizedQuery = query.trim().toLowerCase();
  const visibleGroups = normalizedQuery
    ? groups.filter((g) => g.name.toLowerCase().includes(normalizedQuery))
    : groups;

  const selectedGroup = useMemo(
    () => groups.find((g) => (g.key ?? "general") === selectedKey) ?? null,
    [groups, selectedKey]
  );

  function setValue(settingId: number, value: unknown) {
    setValues((prev) => ({ ...prev, [settingId]: value }));
  }

  async function handleSave() {
    if (!workspaceId || !selectedGroup) return;
    setSaving(true);
    setSaveError(null);

    try {
      const payload = selectedGroup.settings.map((s) => ({
        app_setting_id: s.id,
        value: values[s.id] ?? null,
      }));
      const res = await updateWorkspaceSettings(workspaceId, payload);
      setGroups(res.groups);
    } catch (err) {
      setSaveError(err instanceof ApiError ? err.message : "Une erreur est survenue");
    } finally {
      setSaving(false);
    }
  }

  if (!canManage) {
    return (
      <div className="p-8 max-w-5xl mx-auto">
        <h1 className="text-2xl font-bold text-on-surface">Paramètres</h1>
        <p className="text-sm text-on-surface-variant mt-1">
          Vous n&apos;avez pas accès à cette page.
        </p>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-on-surface">Paramètres</h1>
        <p className="text-sm text-on-surface-variant mt-1">
          Paramètres globaux du workspace et de chaque application.
        </p>
      </div>

      {error && (
        <p className="text-sm text-error bg-error-container/40 rounded-lg px-3 py-2">
          {error}
        </p>
      )}

      {loading ? (
        <p className="text-sm text-on-surface-variant">Chargement…</p>
      ) : (
        <div className="grid grid-cols-[16rem_1fr] gap-6">
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
                placeholder="Rechercher une application…"
                className="w-full pl-9 pr-3 py-2 rounded-xl border border-outline-variant bg-surface text-sm text-on-surface"
              />
            </div>
            <div className="rounded-xl border border-outline-variant divide-y divide-outline-variant overflow-y-auto max-h-[28rem]">
              {visibleGroups.length === 0 && (
                <p className="text-sm text-on-surface-variant px-3 py-3">Aucun résultat.</p>
              )}
              {visibleGroups.map((group) => {
                const groupKey = group.key ?? "general";
                const isSelected = groupKey === selectedKey;
                return (
                  <button
                    key={groupKey}
                    type="button"
                    onClick={() => setSelectedKey(groupKey)}
                    className={`w-full text-left px-3 py-2.5 text-sm transition-colors ${
                      isSelected
                        ? "bg-primary/10 text-primary font-medium"
                        : "text-on-surface hover:bg-surface-container"
                    }`}
                  >
                    {group.name}
                    <span className="ml-1.5 text-xs text-on-surface-variant">
                      ({group.settings.length})
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="rounded-2xl border border-outline-variant bg-surface-container-lowest p-5 space-y-5">
            {!selectedGroup || selectedGroup.settings.length === 0 ? (
              <p className="text-sm text-on-surface-variant">
                Aucun paramètre pour cette application.
              </p>
            ) : (
              <>
                <h2 className="text-sm font-semibold text-on-surface-variant uppercase tracking-wide">
                  {selectedGroup.name}
                </h2>

                <div className="space-y-4">
                  {selectedGroup.settings.map((setting) => (
                    <SettingField
                      key={setting.id}
                      setting={setting}
                      value={values[setting.id]}
                      onChange={(v) => setValue(setting.id, v)}
                    />
                  ))}
                </div>

                {saveError && (
                  <p className="text-sm text-error bg-error-container/40 rounded-lg px-3 py-2">
                    {saveError}
                  </p>
                )}

                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="px-4 py-2 rounded-xl bg-primary text-on-primary text-sm font-medium disabled:opacity-50"
                >
                  {saving ? "Enregistrement…" : "Enregistrer"}
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function SettingField({
  setting,
  value,
  onChange,
}: {
  setting: SettingDef;
  value: unknown;
  onChange: (value: unknown) => void;
}) {
  return (
    <div className="space-y-1">
      <label className="text-sm font-medium text-on-surface">{setting.name}</label>
      {setting.description && (
        <p className="text-xs text-on-surface-variant">{setting.description}</p>
      )}

      {setting.type === "text" && (
        <input
          type="text"
          value={typeof value === "string" ? value : ""}
          onChange={(e) => onChange(e.target.value)}
          className="w-full px-3 py-2 rounded-xl border border-outline-variant bg-surface text-sm text-on-surface"
        />
      )}

      {setting.type === "date" && (
        <input
          type="date"
          value={typeof value === "string" ? value : ""}
          onChange={(e) => onChange(e.target.value)}
          className="w-full px-3 py-2 rounded-xl border border-outline-variant bg-surface text-sm text-on-surface"
        />
      )}

      {setting.type === "single_choice" && (
        <select
          value={typeof value === "string" ? value : ""}
          onChange={(e) => onChange(e.target.value || null)}
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
          onChange={onChange}
        />
      )}
    </div>
  );
}
