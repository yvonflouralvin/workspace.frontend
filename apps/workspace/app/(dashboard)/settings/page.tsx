"use client";

import { useEffect, useMemo, useState } from "react";
import { SearchOutlined } from "@mui/icons-material";
import { useSessionStore } from "@repo/auth/store/session.store";
import { usePermissions } from "@repo/auth/hooks/usePermissions";
import { MultiSelect } from "@repo/ui/MultiSelect";
import {
  listWorkspaceSettings,
  updateWorkspaceSettings,
  getWorkspace,
  updateWorkspacePolicy,
  updateWorkspaceAuthProvider,
  ApiError,
} from "@/app/lib/api";
import type { AppSettingGroup, AuthProvider, SettingDef, WorkspaceDetail } from "@/app/lib/types";

export default function SettingsPage() {
  const activeWorkspace = useSessionStore((s) => s.activeWorkspace);
  const { can } = usePermissions();

  const [groups, setGroups] = useState<AppSettingGroup[]>([]);
  const [values, setValues] = useState<Record<number, unknown>>({});
  const [workspaceDetail, setWorkspaceDetail] = useState<WorkspaceDetail | null>(null);
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

    Promise.all([listWorkspaceSettings(workspaceId), getWorkspace(workspaceId)])
      .then(([settingsRes, workspaceRes]) => {
        setGroups(settingsRes.groups);
        const initialValues: Record<number, unknown> = {};
        for (const group of settingsRes.groups) {
          for (const setting of group.settings) {
            initialValues[setting.id] = setting.value;
          }
        }
        setValues(initialValues);
        setWorkspaceDetail(workspaceRes);
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
            {selectedKey === "general" && workspaceDetail?.type === "organization" && (
              <RestrictionToggle
                workspaceId={workspaceId!}
                workspaceDetail={workspaceDetail}
                onUpdated={setWorkspaceDetail}
              />
            )}

            {selectedKey === "general" &&
              workspaceDetail?.type === "organization" &&
              workspaceDetail.restrict_members_to_workspace && (
                <OrgAuthProviderSection
                  workspaceId={workspaceId!}
                  workspaceDetail={workspaceDetail}
                  onUpdated={setWorkspaceDetail}
                />
              )}

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

function RestrictionToggle({
  workspaceId,
  workspaceDetail,
  onUpdated,
}: {
  workspaceId: number;
  workspaceDetail: WorkspaceDetail;
  onUpdated: (detail: WorkspaceDetail) => void;
}) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleToggle() {
    setSaving(true);
    setError(null);
    try {
      const updated = await updateWorkspacePolicy(
        workspaceId,
        !workspaceDetail.restrict_members_to_workspace
      );
      onUpdated(updated);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Une erreur est survenue");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-xl border border-outline-variant p-4 space-y-2">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-on-surface">
            Restreindre les membres à ce workspace
          </p>
          <p className="text-xs text-on-surface-variant mt-0.5">
            Les membres ne pourront plus changer de workspace ni en créer un autre.
            L&apos;owner n&apos;est pas concerné.
          </p>
        </div>
        <button
          type="button"
          onClick={handleToggle}
          disabled={saving}
          role="switch"
          aria-checked={workspaceDetail.restrict_members_to_workspace}
          className={`relative flex-shrink-0 w-10 h-6 rounded-full transition-colors disabled:opacity-50 ${
            workspaceDetail.restrict_members_to_workspace ? "bg-primary" : "bg-outline-variant"
          }`}
        >
          <span
            className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform ${
              workspaceDetail.restrict_members_to_workspace ? "translate-x-4" : ""
            }`}
          />
        </button>
      </div>
      {error && <p className="text-xs text-error">{error}</p>}
    </div>
  );
}

const AUTH_PROVIDER_OPTIONS: { value: AuthProvider | ""; label: string }[] = [
  { value: "", label: "Aucun" },
  { value: "microsoft_entra", label: "Microsoft Entra" },
  { value: "google_workspace", label: "Google Workspace" },
  { value: "email_otp", label: "Code par email" },
];

const AUTH_PROVIDER_CONFIG_FIELD: Record<string, { key: string; label: string } | null> = {
  microsoft_entra: { key: "tenant_id", label: "Tenant ID" },
  google_workspace: { key: "domain", label: "Domaine" },
  email_otp: null,
};

function OrgAuthProviderSection({
  workspaceId,
  workspaceDetail,
  onUpdated,
}: {
  workspaceId: number;
  workspaceDetail: WorkspaceDetail;
  onUpdated: (detail: WorkspaceDetail) => void;
}) {
  const [provider, setProvider] = useState<AuthProvider | "">(workspaceDetail.auth_provider ?? "");
  const [configValue, setConfigValue] = useState(
    workspaceDetail.auth_provider_config
      ? Object.values(workspaceDetail.auth_provider_config)[0] ?? ""
      : ""
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const configField = provider ? AUTH_PROVIDER_CONFIG_FIELD[provider] : null;

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      const updated = await updateWorkspaceAuthProvider(
        workspaceId,
        provider || null,
        configField ? { [configField.key]: configValue } : undefined
      );
      onUpdated(updated);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Une erreur est survenue");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-xl border border-outline-variant p-4 space-y-3">
      <div>
        <p className="text-sm font-medium text-on-surface">Authentification de l&apos;organisation</p>
        <p className="text-xs text-on-surface-variant mt-0.5">
          Impose un mode de connexion aux membres de ce workspace. Ils ne pourront plus utiliser
          leurs préférences personnelles tant que cette politique est active.
        </p>
      </div>

      <select
        value={provider}
        onChange={(e) => setProvider(e.target.value as AuthProvider | "")}
        className="w-full px-3 py-2 rounded-xl border border-outline-variant bg-surface text-sm text-on-surface"
      >
        {AUTH_PROVIDER_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>

      {configField && (
        <input
          type="text"
          value={configValue}
          onChange={(e) => setConfigValue(e.target.value)}
          placeholder={configField.label}
          className="w-full px-3 py-2 rounded-xl border border-outline-variant bg-surface text-sm text-on-surface"
        />
      )}

      {error && <p className="text-xs text-error">{error}</p>}

      <button
        onClick={handleSave}
        disabled={saving}
        className="px-4 py-2 rounded-xl bg-primary text-on-primary text-sm font-medium disabled:opacity-50"
      >
        {saving ? "Enregistrement…" : "Enregistrer"}
      </button>
    </div>
  );
}
