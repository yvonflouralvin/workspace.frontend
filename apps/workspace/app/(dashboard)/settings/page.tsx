"use client";

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  ChatOutlined,
  DescriptionOutlined,
  EditOutlined,
  ExpandMoreOutlined,
  FactCheckOutlined,
  FolderOpenOutlined,
  GroupsOutlined,
  HistoryOutlined,
  Inventory2Outlined,
  LocalHospitalOutlined,
  MailOutlined,
  NotificationsOutlined,
  PeopleAltOutlined,
  QueryStatsOutlined,
  ReceiptLongOutlined,
  SmsOutlined,
  TuneOutlined,
  WidgetsOutlined,
} from "@mui/icons-material";
import { useSessionStore } from "@repo/auth/store/session.store";
import { usePermissions } from "@repo/auth/hooks/usePermissions";
import { SearchField } from "@repo/ui/SearchField";
import { SettingRow, isInlineSetting, type SettingRowState } from "@repo/ui/SettingRow";
import { Switch } from "@repo/ui/Switch";
import { Toast } from "@repo/ui/Toast";
import {
  listWorkspaceSettings,
  getWorkspace,
  updateWorkspaceSettings,
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

const GENERAL_KEY = "general";

const APP_ICONS: Record<string, ReactNode> = {
  [GENERAL_KEY]: <TuneOutlined style={{ fontSize: 18 }} />,
  projects: <FolderOpenOutlined style={{ fontSize: 18 }} />,
  ventes: <ReceiptLongOutlined style={{ fontSize: 18 }} />,
  hr: <PeopleAltOutlined style={{ fontSize: 18 }} />,
  documents: <DescriptionOutlined style={{ fontSize: 18 }} />,
  stock: <Inventory2Outlined style={{ fontSize: 18 }} />,
  hosto: <LocalHospitalOutlined style={{ fontSize: 18 }} />,
  tiers: <GroupsOutlined style={{ fontSize: 18 }} />,
  dashboard: <QueryStatsOutlined style={{ fontSize: 18 }} />,
  approval_flows: <FactCheckOutlined style={{ fontSize: 18 }} />,
  audit_logs: <HistoryOutlined style={{ fontSize: 18 }} />,
};

const CHANNEL_ICONS: Record<string, ReactNode> = {
  email: <MailOutlined style={{ fontSize: 18 }} />,
  sms: <SmsOutlined style={{ fontSize: 18 }} />,
  whatsapp: <ChatOutlined style={{ fontSize: 18 }} />,
};

const SECTION_LABEL = "text-label-sm uppercase text-outline";

function sameValue(a: unknown, b: unknown): boolean {
  if (Array.isArray(a) && Array.isArray(b)) {
    return a.length === b.length && a.every((v, i) => v === b[i]);
  }
  return (a ?? null) === (b ?? null);
}

function isEmptyValue(value: unknown): boolean {
  if (value === null || value === undefined || value === "") return true;
  return Array.isArray(value) && value.length === 0;
}

function formatValue(setting: SettingDef, value: unknown): string {
  if (isEmptyValue(value)) return "Non configuré";

  if (setting.type === "date" && typeof value === "string") {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString("fr-FR");
  }
  if (setting.type === "single_choice") {
    return (setting.options ?? []).find((o) => o.value === value)?.label ?? String(value);
  }
  if (setting.type === "multi_choice" && Array.isArray(value)) {
    const labels = new Map((setting.options ?? []).map((o) => [o.value, o.label]));
    return value.map((v) => labels.get(v as string) ?? String(v)).join(", ");
  }
  return String(value);
}

export default function SettingsPage() {
  const activeWorkspace = useSessionStore((s) => s.activeWorkspace);
  const { can } = usePermissions();

  const [groups, setGroups] = useState<AppSettingGroup[]>([]);
  const [workspaceDetail, setWorkspaceDetail] = useState<WorkspaceDetail | null>(null);
  const [channels, setChannels] = useState<NotificationChannelConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [channelsError, setChannelsError] = useState(false);

  const [appQuery, setAppQuery] = useState("");
  const [settingQuery, setSettingQuery] = useState("");
  const [selectedKey, setSelectedKey] = useState<string>(GENERAL_KEY);

  const [editingSetting, setEditingSetting] = useState<SettingDef | null>(null);
  const [editingChannel, setEditingChannel] = useState<NotificationChannelConfig | null>(null);

  // Modifications en attente, par identifiant de paramètre : l'édition en ligne
  // comme le drawer alimentent ce tampon, la barre collante seule écrit au serveur.
  const [pending, setPending] = useState<Record<number, unknown>>({});
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ message: string; tone: "success" | "error" } | null>(null);

  const workspaceId = activeWorkspace?.id;
  const canManage = can("workspace.settings.manage");

  useEffect(() => {
    if (!workspaceId || !canManage) {
      setLoading(false);
      return;
    }
    // Chaque source est chargée séparément : un service indisponible ne doit pas
    // vider tout le catalogue de paramètres.
    Promise.all([
      listWorkspaceSettings(workspaceId).then((res) => setGroups(res.groups)),
      getWorkspace(workspaceId).then(setWorkspaceDetail),
    ])
      .catch((err) => setError(err instanceof ApiError ? err.message : "Une erreur est survenue"))
      .finally(() => setLoading(false));

    listNotificationChannels(workspaceId)
      .then((res) => {
        setChannels(res.channels);
        setChannelsError(false);
      })
      .catch(() => setChannelsError(true));
  }, [workspaceId, canManage]);

  const selectedGroup = useMemo(
    () => groups.find((g) => (g.key ?? GENERAL_KEY) === selectedKey) ?? null,
    [groups, selectedKey]
  );

  const normalizedAppQuery = appQuery.trim().toLowerCase();
  const visibleGroups = normalizedAppQuery
    ? groups.filter((g) => g.name.toLowerCase().includes(normalizedAppQuery))
    : groups;

  const normalizedSettingQuery = settingQuery.trim().toLowerCase();
  const filteredSettings = useMemo(() => {
    if (!selectedGroup) return [];
    if (!normalizedSettingQuery) return selectedGroup.settings;
    return selectedGroup.settings.filter(
      (s) =>
        s.name.toLowerCase().includes(normalizedSettingQuery) ||
        (s.description ?? "").toLowerCase().includes(normalizedSettingQuery)
    );
  }, [selectedGroup, normalizedSettingQuery]);

  /** Sections dans leur ordre d'apparition, les paramètres sans section d'abord. */
  const sections = useMemo(() => {
    const ordered: { title: string | null; settings: SettingDef[] }[] = [
      { title: null, settings: [] },
    ];
    for (const setting of filteredSettings) {
      if (!setting.section) {
        ordered[0]!.settings.push(setting);
        continue;
      }
      const existing = ordered.find((s) => s.title === setting.section);
      if (existing) existing.settings.push(setting);
      else ordered.push({ title: setting.section, settings: [setting] });
    }
    return ordered.filter((s) => s.settings.length > 0);
  }, [filteredSettings]);

  const valueOf = useCallback(
    (setting: SettingDef) => (setting.id in pending ? pending[setting.id] : setting.value),
    [pending]
  );

  // Revenir à la valeur d'origine retire la modification du tampon : la barre
  // ne doit pas signaler un changement qui n'en est pas un.
  const queueChange = useCallback((setting: SettingDef, value: unknown) => {
    setPending((prev) => {
      const next = { ...prev };
      if (sameValue(value, setting.value)) delete next[setting.id];
      else next[setting.id] = value;
      return next;
    });
  }, []);

  const dirtyCount = Object.keys(pending).length;

  const save = useCallback(async () => {
    if (!workspaceId || dirtyCount === 0) return;
    setSaving(true);
    try {
      const res = await updateWorkspaceSettings(
        workspaceId,
        Object.entries(pending).map(([id, value]) => ({
          app_setting_id: Number(id),
          value: value ?? null,
        }))
      );
      setGroups(res.groups);
      setPending({});
      setToast({ message: "Paramètres enregistrés.", tone: "success" });
    } catch (err) {
      setToast({
        message: err instanceof ApiError ? err.message : "Une erreur est survenue",
        tone: "error",
      });
    } finally {
      setSaving(false);
    }
  }, [workspaceId, pending, dirtyCount]);

  if (!canManage) {
    return (
      <div className="p-8 max-w-[1024px] mx-auto">
        <h1 className="font-display text-headline-md text-on-surface">Paramètres</h1>
        <p className="text-body-md text-on-surface-variant mt-0.5">
          Vous n&apos;avez pas accès à cette page.
        </p>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-[1024px] mx-auto">
      <div className="mb-6">
        <h1 className="font-display text-headline-md text-on-surface">Paramètres</h1>
        <p className="text-body-md text-on-surface-variant mt-0.5">
          Paramètres globaux du workspace et de chaque application.
        </p>
      </div>

      {error && (
        <p className="text-body-sm text-error bg-error-container/40 rounded-lg px-3 py-2 mb-4">
          {error}
        </p>
      )}

      {loading ? (
        <p className="text-body-md text-on-surface-variant">Chargement…</p>
      ) : (
        <div className="grid grid-cols-[256px_1fr] gap-6 items-start">
          <div>
            <SearchField
              value={appQuery}
              onChange={setAppQuery}
              placeholder="Rechercher une application…"
              className="w-full mb-2.5"
            />
            <div className="rounded-xl border border-outline-soft bg-surface-container-lowest overflow-hidden max-h-[448px] overflow-y-auto">
              {visibleGroups.length === 0 && (
                <p className="px-3.5 py-3 text-body-sm text-on-surface-variant">Aucun résultat.</p>
              )}
              {visibleGroups.map((group) => {
                const key = group.key ?? GENERAL_KEY;
                const active = key === selectedKey;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => {
                      setSelectedKey(key);
                      setSettingQuery("");
                    }}
                    className={`w-full flex items-center gap-2.5 px-3.5 py-2.5 text-left border-b border-hairline last:border-b-0 transition-colors ${
                      active ? "bg-primary/10" : "hover:bg-surface-container-low"
                    }`}
                  >
                    <span
                      className={`w-[18px] h-[18px] flex-none inline-flex items-center justify-center ${
                        active ? "text-primary" : "text-outline"
                      }`}
                    >
                      {APP_ICONS[key] ?? <WidgetsOutlined style={{ fontSize: 18 }} />}
                    </span>
                    <span
                      className={`flex-1 min-w-0 truncate text-body-sm ${
                        active ? "font-semibold text-primary" : "font-medium text-on-surface"
                      }`}
                    >
                      {group.name}
                    </span>
                    <span className="text-label-md text-outline">{group.settings.length}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="relative rounded-2xl border border-outline-soft bg-surface-container-lowest p-5">
            {selectedKey === GENERAL_KEY ? (
              <div className="flex flex-col gap-4">
                {workspaceDetail?.type === "organization" && (
                  <RestrictionBlock
                    workspaceId={workspaceId!}
                    workspaceDetail={workspaceDetail}
                    onUpdated={setWorkspaceDetail}
                    onError={(message) => setToast({ message, tone: "error" })}
                  />
                )}

                {workspaceDetail?.type === "organization" &&
                  workspaceDetail.restrict_members_to_workspace && (
                    <AuthProviderBlock
                      workspaceId={workspaceId!}
                      workspaceDetail={workspaceDetail}
                      onUpdated={(detail) => {
                        setWorkspaceDetail(detail);
                        setToast({ message: "Authentification mise à jour.", tone: "success" });
                      }}
                      onError={(message) => setToast({ message, tone: "error" })}
                    />
                  )}

                <NotificationsBlock
                  channels={channels}
                  unavailable={channelsError}
                  onEdit={setEditingChannel}
                />

                {selectedGroup && selectedGroup.settings.length > 0 && (
                  <SettingsSections
                    sections={sections}
                    valueOf={valueOf}
                    onInlineChange={queueChange}
                    onEdit={setEditingSetting}
                  />
                )}
              </div>
            ) : !selectedGroup || selectedGroup.settings.length === 0 ? (
              <p className="text-body-md text-on-surface-variant">
                Aucun paramètre pour cette application.
              </p>
            ) : (
              <>
                <SearchField
                  value={settingQuery}
                  onChange={setSettingQuery}
                  placeholder="Rechercher un paramètre…"
                  className="w-full mb-4"
                />
                <p className={`${SECTION_LABEL} mb-3`}>{selectedGroup.name}</p>
                {sections.length === 0 ? (
                  <p className="text-body-sm text-on-surface-variant">Aucun résultat.</p>
                ) : (
                  <SettingsSections
                    sections={sections}
                    valueOf={valueOf}
                    onInlineChange={queueChange}
                    onEdit={setEditingSetting}
                  />
                )}
              </>
            )}

            {dirtyCount > 0 && (
              <div className="sticky bottom-0 -mx-5 -mb-5 mt-5 flex items-center gap-3 px-5 py-3 bg-surface-container-low border-t border-primary-fixed-dim rounded-b-2xl animate-toast-in">
                <span className="w-2 h-2 rounded-full bg-primary" />
                <span className="flex-1 text-body-sm font-medium text-primary">
                  {dirtyCount} modification{dirtyCount > 1 ? "s" : ""} non enregistrée
                  {dirtyCount > 1 ? "s" : ""}
                </span>
                <button
                  onClick={() => setPending({})}
                  disabled={saving}
                  className="h-8 px-3 rounded-lg border border-primary-fixed-dim bg-surface-container-lowest text-label-md font-semibold text-on-surface-variant hover:bg-surface-container transition-colors"
                >
                  Annuler
                </button>
                <button
                  onClick={save}
                  disabled={saving}
                  className="h-8 px-4 rounded-lg bg-primary text-on-primary text-label-md font-semibold shadow-button hover:bg-primary-container disabled:opacity-50 transition-colors"
                >
                  {saving ? "Enregistrement…" : "Enregistrer"}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {editingSetting && (
        <SettingValueDrawer
          setting={editingSetting}
          value={valueOf(editingSetting)}
          onApply={(value) => {
            queueChange(editingSetting, value);
            setEditingSetting(null);
          }}
          onClose={() => setEditingSetting(null)}
        />
      )}

      {editingChannel && workspaceId && (
        <NotificationChannelDrawer
          workspaceId={workspaceId}
          channelConfig={editingChannel}
          onClose={() => setEditingChannel(null)}
          onSaved={(updated) => {
            setChannels((prev) => prev.map((c) => (c.channel === updated.channel ? updated : c)));
            setToast({ message: "Canal enregistré.", tone: "success" });
          }}
        />
      )}

      {toast && <Toast message={toast.message} tone={toast.tone} onDismiss={() => setToast(null)} />}
    </div>
  );
}

function SettingsSections({
  sections,
  valueOf,
  onInlineChange,
  onEdit,
}: {
  sections: { title: string | null; settings: SettingDef[] }[];
  valueOf: (setting: SettingDef) => unknown;
  onInlineChange: (setting: SettingDef, value: unknown) => void;
  onEdit: (setting: SettingDef) => void;
}) {
  return (
    <div className="flex flex-col gap-4">
      {sections.map((section) => (
        <div key={section.title ?? "__flat"}>
          {section.title && (
            <p className="text-label-md font-semibold text-on-surface-variant mb-2">
              {section.title}
            </p>
          )}
          <div className="rounded-xl border border-outline-soft overflow-hidden">
            {section.settings.map((setting) => {
              const value = valueOf(setting);
              const state: SettingRowState = isEmptyValue(value) ? "unset" : "ok";
              return (
                <SettingRow
                  key={setting.id}
                  name={setting.name}
                  description={setting.description}
                  type={setting.type}
                  value={value}
                  displayValue={formatValue(setting, value)}
                  options={setting.options}
                  state={state}
                  onChange={
                    isInlineSetting(setting.type)
                      ? (next) => onInlineChange(setting, next)
                      : undefined
                  }
                  onEdit={() => onEdit(setting)}
                />
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

function RestrictionBlock({
  workspaceId,
  workspaceDetail,
  onUpdated,
  onError,
}: {
  workspaceId: number;
  workspaceDetail: WorkspaceDetail;
  onUpdated: (detail: WorkspaceDetail) => void;
  onError: (message: string) => void;
}) {
  const [saving, setSaving] = useState(false);

  async function toggle(next: boolean) {
    setSaving(true);
    try {
      onUpdated(await updateWorkspacePolicy(workspaceId, next));
    } catch (err) {
      onError(err instanceof ApiError ? err.message : "Une erreur est survenue");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex items-start gap-4 rounded-xl border border-outline-soft p-4">
      <div className="flex-1">
        <p className="text-body-md font-semibold text-on-surface">
          Restreindre les membres à ce workspace
        </p>
        <p className="text-label-md text-outline mt-0.5 leading-relaxed">
          Les membres ne pourront plus changer de workspace ni en créer un autre.
          L&apos;owner n&apos;est pas concerné.
        </p>
      </div>
      <Switch
        checked={workspaceDetail.restrict_members_to_workspace}
        disabled={saving}
        label="Restreindre les membres à ce workspace"
        onChange={toggle}
      />
    </div>
  );
}

const AUTH_PROVIDER_OPTIONS: { value: AuthProvider | ""; label: string }[] = [
  { value: "", label: "Aucun" },
  { value: "microsoft_entra", label: "Microsoft Entra" },
  { value: "google_workspace", label: "Google Workspace" },
  { value: "email_otp", label: "Code par email" },
];

const AUTH_PROVIDER_FIELD: Record<string, { key: string; label: string; placeholder: string } | null> = {
  microsoft_entra: {
    key: "tenant_id",
    label: "Tenant ID",
    placeholder: "00000000-0000-0000-0000-000000000000",
  },
  google_workspace: { key: "domain", label: "Domaine", placeholder: "exemple.com" },
  email_otp: null,
};

function AuthProviderBlock({
  workspaceId,
  workspaceDetail,
  onUpdated,
  onError,
}: {
  workspaceId: number;
  workspaceDetail: WorkspaceDetail;
  onUpdated: (detail: WorkspaceDetail) => void;
  onError: (message: string) => void;
}) {
  const [provider, setProvider] = useState<AuthProvider | "">(workspaceDetail.auth_provider ?? "");
  const [configValue, setConfigValue] = useState(
    workspaceDetail.auth_provider_config
      ? (Object.values(workspaceDetail.auth_provider_config)[0] ?? "")
      : ""
  );
  const [saving, setSaving] = useState(false);

  const field = provider ? AUTH_PROVIDER_FIELD[provider] : null;

  async function save() {
    setSaving(true);
    try {
      onUpdated(
        await updateWorkspaceAuthProvider(
          workspaceId,
          provider || null,
          field ? { [field.key]: configValue } : undefined
        )
      );
    } catch (err) {
      onError(err instanceof ApiError ? err.message : "Une erreur est survenue");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-xl border border-outline-soft p-4">
      <p className="text-body-md font-semibold text-on-surface">
        Authentification de l&apos;organisation
      </p>
      <p className="text-label-md text-outline mt-0.5 mb-3">
        Méthode de connexion imposée aux membres.
      </p>

      <div className="flex flex-wrap items-end gap-2.5">
        <div>
          <label className="block text-[11px] font-semibold text-on-surface-variant mb-1.5">
            Fournisseur
          </label>
          <select
            value={provider}
            onChange={(e) => setProvider(e.target.value as AuthProvider | "")}
            className="h-9 w-[220px] px-2.5 rounded-lg border border-outline-soft bg-surface-container-lowest text-body-sm text-on-surface outline-none focus:border-primary"
          >
            {AUTH_PROVIDER_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        {field && (
          <div>
            <label className="block text-[11px] font-semibold text-on-surface-variant mb-1.5">
              {field.label}
            </label>
            <input
              type="text"
              value={configValue}
              onChange={(e) => setConfigValue(e.target.value)}
              placeholder={field.placeholder}
              className="h-9 w-[220px] px-2.5 rounded-lg border border-outline-soft bg-surface-container-lowest font-mono text-body-sm text-on-surface outline-none focus:border-primary"
            />
          </div>
        )}

        <button
          onClick={save}
          disabled={saving}
          className="h-9 px-4 rounded-lg bg-primary text-on-primary text-body-sm font-semibold shadow-button hover:bg-primary-container disabled:opacity-50 transition-colors"
        >
          {saving ? "Enregistrement…" : "Enregistrer"}
        </button>
      </div>
    </div>
  );
}

function NotificationsBlock({
  channels,
  unavailable,
  onEdit,
}: {
  channels: NotificationChannelConfig[];
  unavailable: boolean;
  onEdit: (channel: NotificationChannelConfig) => void;
}) {
  const [open, setOpen] = useState(true);

  if (unavailable) {
    return (
      <div className="rounded-xl border border-outline-soft px-4 py-3.5">
        <p className="text-body-md font-semibold text-on-surface">Notifications</p>
        <p className="text-label-md text-outline mt-0.5">
          Service de notifications injoignable — la configuration des canaux est
          momentanément indisponible.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-outline-soft overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-2.5 px-4 py-3.5 hover:bg-surface-row-alt transition-colors"
      >
        <span className="w-5 h-5 flex-none inline-flex items-center justify-center text-primary">
          <NotificationsOutlined style={{ fontSize: 20 }} />
        </span>
        <span className="flex-1 text-left text-body-md font-semibold text-on-surface">
          Notifications <span className="font-normal text-outline">{channels.length}</span>
        </span>
        <ExpandMoreOutlined
          style={{ fontSize: 16 }}
          className={`text-outline transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div className="border-t border-hairline">
          {channels.map((channel) => {
            const configured = Boolean(channel.config);
            return (
              <div
                key={channel.channel}
                className="flex items-center gap-3 px-4 py-3 border-t border-hairline-soft first:border-t-0"
              >
                <span className="w-[18px] h-[18px] flex-none inline-flex items-center justify-center text-on-surface-variant">
                  {CHANNEL_ICONS[channel.channel]}
                </span>
                <span className="flex-1 text-body-md font-medium text-on-surface">
                  {NOTIFICATION_CHANNEL_LABELS[channel.channel]}
                </span>
                <span
                  className={`inline-flex items-center gap-1.5 text-label-md font-semibold ${
                    configured ? "text-member-active" : "text-member-invited"
                  }`}
                >
                  <span
                    className={`w-[7px] h-[7px] rounded-full ${
                      configured ? "bg-member-active" : "bg-member-invited"
                    }`}
                  />
                  {configured ? "Configuré" : "Non configuré"}
                </span>
                <button
                  type="button"
                  onClick={() => onEdit(channel)}
                  title="Modifier"
                  aria-label={`Configurer ${NOTIFICATION_CHANNEL_LABELS[channel.channel]}`}
                  className="w-[30px] h-[30px] flex items-center justify-center rounded-md border border-outline-soft bg-surface-container-lowest text-on-surface-variant hover:bg-surface-container-low hover:text-primary transition-colors"
                >
                  <EditOutlined style={{ fontSize: 14 }} />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
