"use client";

import { useEffect, useMemo, useState } from "react";
import { SearchOutlined, EditOutlined } from "@mui/icons-material";
import { useSessionStore } from "@repo/auth/store/session.store";
import { usePermissions } from "@repo/auth/hooks/usePermissions";
import { Accordion } from "@repo/ui/Accordion";
import {
  listWorkspaceSettings,
  getWorkspace,
  updateWorkspacePolicy,
  updateWorkspaceAuthProvider,
  listNotificationChannels,
  ApiError,
} from "@/app/lib/api";
import type {
  AppSettingGroup,
  AuthProvider,
  NotificationChannelConfig,
  SettingDef,
  WorkspaceDetail,
} from "@/app/lib/types";
import { SettingValueDrawer } from "@/components/SettingValueDrawer";
import {
  NotificationChannelDrawer,
  NOTIFICATION_CHANNEL_LABELS,
} from "@/components/NotificationChannelDrawer";

function formatSettingValue(setting: SettingDef): string {
  const value = setting.value;

  if (value === null || value === undefined || value === "") return "—";

  if (setting.type === "date" && typeof value === "string") {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString("fr-FR");
  }

  if (setting.type === "single_choice") {
    const option = (setting.options ?? []).find((o) => o.value === value);
    return option?.label ?? String(value);
  }

  if (setting.type === "multi_choice" && Array.isArray(value)) {
    if (value.length === 0) return "—";
    const labelsByValue = new Map((setting.options ?? []).map((o) => [o.value, o.label]));
    return value.map((v) => labelsByValue.get(v as string) ?? String(v)).join(", ");
  }

  return String(value);
}

export default function SettingsPage() {
  const activeWorkspace = useSessionStore((s) => s.activeWorkspace);
  const { can } = usePermissions();

  const [groups, setGroups] = useState<AppSettingGroup[]>([]);
  const [workspaceDetail, setWorkspaceDetail] = useState<WorkspaceDetail | null>(null);
  const [notificationChannels, setNotificationChannels] = useState<NotificationChannelConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [appQuery, setAppQuery] = useState("");
  const [settingQuery, setSettingQuery] = useState("");
  const [selectedKey, setSelectedKey] = useState<string>("general");
  const [editingSetting, setEditingSetting] = useState<SettingDef | null>(null);
  const [editingChannel, setEditingChannel] = useState<NotificationChannelConfig | null>(null);

  const workspaceId = activeWorkspace?.id;
  const canManage = can("workspace.settings.manage");

  useEffect(() => {
    if (!workspaceId || !canManage) {
      setLoading(false);
      return;
    }

    Promise.all([
      listWorkspaceSettings(workspaceId),
      getWorkspace(workspaceId),
      listNotificationChannels(workspaceId),
    ])
      .then(([settingsRes, workspaceRes, channelsRes]) => {
        setGroups(settingsRes.groups);
        setWorkspaceDetail(workspaceRes);
        setNotificationChannels(channelsRes.channels);
      })
      .catch((err) => {
        setError(err instanceof ApiError ? err.message : "Une erreur est survenue");
      })
      .finally(() => setLoading(false));
  }, [workspaceId, canManage]);

  const normalizedAppQuery = appQuery.trim().toLowerCase();
  const visibleGroups = normalizedAppQuery
    ? groups.filter((g) => g.name.toLowerCase().includes(normalizedAppQuery))
    : groups;

  const selectedGroup = useMemo(
    () => groups.find((g) => (g.key ?? "general") === selectedKey) ?? null,
    [groups, selectedKey]
  );

  const normalizedSettingQuery = settingQuery.trim().toLowerCase();
  const isSearchingSettings = normalizedSettingQuery.length > 0;

  const filteredSettings = useMemo(() => {
    if (!selectedGroup) return [];
    if (!isSearchingSettings) return selectedGroup.settings;
    return selectedGroup.settings.filter(
      (s) =>
        s.name.toLowerCase().includes(normalizedSettingQuery) ||
        (s.description ?? "").toLowerCase().includes(normalizedSettingQuery)
    );
  }, [selectedGroup, isSearchingSettings, normalizedSettingQuery]);

  const flatSettings = filteredSettings.filter((s) => !s.section);

  const sectionedSettings = useMemo(() => {
    const sections: { name: string; settings: SettingDef[] }[] = [];
    for (const setting of filteredSettings) {
      if (!setting.section) continue;
      const existing = sections.find((sec) => sec.name === setting.section);
      if (existing) {
        existing.settings.push(setting);
      } else {
        sections.push({ name: setting.section, settings: [setting] });
      }
    }
    return sections;
  }, [filteredSettings]);

  function handleSettingsUpdated(updatedGroups: AppSettingGroup[]) {
    setGroups(updatedGroups);
  }

  function handleChannelUpdated(updated: NotificationChannelConfig) {
    setNotificationChannels((prev) =>
      prev.map((c) => (c.channel === updated.channel ? updated : c))
    );
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
                value={appQuery}
                onChange={(e) => setAppQuery(e.target.value)}
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
                    onClick={() => {
                      setSelectedKey(groupKey);
                      setSettingQuery("");
                    }}
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

            {selectedKey === "general" && (
              <Accordion title="Notifications" badge={`(${notificationChannels.length})`}>
                <div className="divide-y divide-outline-variant">
                  {notificationChannels.map((channelConfig) => (
                    <NotificationChannelRow
                      key={channelConfig.channel}
                      channelConfig={channelConfig}
                      onEdit={() => setEditingChannel(channelConfig)}
                    />
                  ))}
                </div>
              </Accordion>
            )}

            {!selectedGroup || selectedGroup.settings.length === 0 ? (
              <p className="text-sm text-on-surface-variant">
                Aucun paramètre pour cette application.
              </p>
            ) : (
              <>
                <div className="flex items-center justify-between gap-4">
                  <h2 className="text-sm font-semibold text-on-surface-variant uppercase tracking-wide">
                    {selectedGroup.name}
                  </h2>
                </div>

                <div className="relative">
                  <SearchOutlined
                    style={{ fontSize: 18 }}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant"
                  />
                  <input
                    type="text"
                    value={settingQuery}
                    onChange={(e) => setSettingQuery(e.target.value)}
                    placeholder="Rechercher un paramètre…"
                    className="w-full pl-9 pr-3 py-2 rounded-xl border border-outline-variant bg-surface text-sm text-on-surface"
                  />
                </div>

                {filteredSettings.length === 0 ? (
                  <p className="text-sm text-on-surface-variant">Aucun résultat.</p>
                ) : (
                  <div className="space-y-3">
                    {flatSettings.length > 0 && (
                      <div className="rounded-xl border border-outline-variant divide-y divide-outline-variant">
                        {flatSettings.map((setting) => (
                          <SettingRow
                            key={setting.id}
                            setting={setting}
                            onEdit={() => setEditingSetting(setting)}
                          />
                        ))}
                      </div>
                    )}

                    {sectionedSettings.map((section) => (
                      <Accordion
                        key={`${section.name}-${isSearchingSettings}`}
                        title={section.name}
                        badge={`(${section.settings.length})`}
                        defaultOpen={isSearchingSettings}
                      >
                        <div className="divide-y divide-outline-variant">
                          {section.settings.map((setting) => (
                            <SettingRow
                              key={setting.id}
                              setting={setting}
                              onEdit={() => setEditingSetting(setting)}
                            />
                          ))}
                        </div>
                      </Accordion>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {editingSetting && workspaceId && (
        <SettingValueDrawer
          workspaceId={workspaceId}
          setting={editingSetting}
          onClose={() => setEditingSetting(null)}
          onSaved={handleSettingsUpdated}
        />
      )}

      {editingChannel && workspaceId && (
        <NotificationChannelDrawer
          workspaceId={workspaceId}
          channelConfig={editingChannel}
          onClose={() => setEditingChannel(null)}
          onSaved={handleChannelUpdated}
        />
      )}
    </div>
  );
}

function NotificationChannelRow({
  channelConfig,
  onEdit,
}: {
  channelConfig: NotificationChannelConfig;
  onEdit: () => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4 px-4 py-3">
      <div className="min-w-0">
        <p className="text-sm font-medium text-on-surface">
          {NOTIFICATION_CHANNEL_LABELS[channelConfig.channel]}
        </p>
        <p className="text-sm text-on-surface-variant mt-1">
          {channelConfig.config ? "Configuré" : "Non configuré"}
        </p>
      </div>
      <button
        type="button"
        onClick={onEdit}
        title="Modifier"
        className="flex-shrink-0 text-on-surface-variant hover:text-primary transition-colors"
      >
        <EditOutlined style={{ fontSize: 18 }} />
      </button>
    </div>
  );
}

function SettingRow({ setting, onEdit }: { setting: SettingDef; onEdit: () => void }) {
  return (
    <div className="flex items-center justify-between gap-4 px-4 py-3">
      <div className="min-w-0">
        <p className="text-sm font-medium text-on-surface">{setting.name}</p>
        {setting.description && (
          <p className="text-xs text-on-surface-variant mt-0.5">{setting.description}</p>
        )}
        <p className="text-sm text-on-surface-variant mt-1">{formatSettingValue(setting)}</p>
      </div>
      <button
        type="button"
        onClick={onEdit}
        title="Modifier"
        className="flex-shrink-0 text-on-surface-variant hover:text-primary transition-colors"
      >
        <EditOutlined style={{ fontSize: 18 }} />
      </button>
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
