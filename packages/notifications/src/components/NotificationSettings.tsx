"use client";

import { useEffect, useState } from "react";
import { CheckCircleOutlined } from "@mui/icons-material";
import { Accordion } from "@repo/ui/Accordion";
import { Checkbox } from "@repo/ui/Checkbox";
import { MultiSelect } from "@repo/ui/MultiSelect";
import {
  getConfig,
  listGroups,
  listPermissions,
  updateRule,
} from "../api/client";
import type {
  NotificationConfigType,
  PermissionOption,
  WorkspaceGroup,
} from "../types/notification";

const CHANNEL_LABELS: Record<string, string> = {
  in_app: "Dans l'application",
  email: "E-mail",
  whatsapp: "WhatsApp",
};

function channelLabel(key: string): string {
  return CHANNEL_LABELS[key] ?? key;
}

type Draft = Pick<
  NotificationConfigType,
  "enabled" | "channels" | "recipient_group_ids" | "recipient_permissions"
>;

export function NotificationSettings({
  appKey,
  basePath = "/api/notifications",
  groupsPath = "/api/notifications/groups",
  permissionsPath = "/api/notifications/permissions",
}: {
  appKey: string;
  basePath?: string;
  groupsPath?: string;
  permissionsPath?: string;
}) {
  const [types, setTypes] = useState<NotificationConfigType[]>([]);
  const [groups, setGroups] = useState<WorkspaceGroup[]>([]);
  const [permissions, setPermissions] = useState<PermissionOption[]>([]);
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [savedKey, setSavedKey] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const [config, grps, perms] = await Promise.all([
          getConfig(appKey, basePath),
          listGroups(groupsPath).catch(() => [] as WorkspaceGroup[]),
          listPermissions(permissionsPath).catch(() => [] as PermissionOption[]),
        ]);
        if (!active) return;
        setTypes(config.items);
        setGroups(grps);
        setPermissions(perms);
        const initial: Record<string, Draft> = {};
        for (const t of config.items) {
          initial[t.type_key] = {
            enabled: t.enabled,
            channels: t.channels,
            recipient_group_ids: t.recipient_group_ids,
            recipient_permissions: t.recipient_permissions,
          };
        }
        setDrafts(initial);
      } catch {
        if (active) setError("Impossible de charger la configuration des notifications.");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [appKey, basePath, groupsPath, permissionsPath]);

  function patch(typeKey: string, next: Partial<Draft>) {
    setDrafts((prev) => ({ ...prev, [typeKey]: { ...prev[typeKey]!, ...next } }));
    setSavedKey(null);
  }

  function toggleChannel(typeKey: string, channel: string) {
    const current = drafts[typeKey]!.channels;
    const next = current.includes(channel)
      ? current.filter((c) => c !== channel)
      : [...current, channel];
    patch(typeKey, { channels: next });
  }

  async function save(typeKey: string) {
    const draft = drafts[typeKey];
    if (!draft) return;
    setSavingKey(typeKey);
    setSavedKey(null);
    setError(null);
    try {
      const updated = await updateRule(typeKey, draft, basePath);
      setTypes((prev) => prev.map((t) => (t.type_key === typeKey ? updated : t)));
      setSavedKey(typeKey);
    } catch {
      setError("Échec de l'enregistrement. Réessayez.");
    } finally {
      setSavingKey(null);
    }
  }

  if (loading) {
    return <p className="text-body-sm text-on-surface-variant">Chargement…</p>;
  }

  if (error && types.length === 0) {
    return <p className="text-body-sm text-error">{error}</p>;
  }

  if (types.length === 0) {
    return (
      <p className="text-body-sm text-on-surface-variant">
        Aucune notification configurable pour cette application.
      </p>
    );
  }

  const groupOptions = groups.map((g) => ({ id: g.id, label: g.name }));
  const permissionOptions = permissions.map((p) => ({ id: p.key, label: p.label }));

  return (
    <div className="space-y-3">
      {error && <p className="text-body-sm text-error">{error}</p>}
      {types.map((t) => {
        const draft = drafts[t.type_key]!;
        return (
          <Accordion
            key={t.type_key}
            title={t.label}
            badge={draft.enabled ? undefined : "(désactivée)"}
          >
            <div className="p-4 space-y-5">
              {t.description && (
                <p className="text-body-sm text-on-surface-variant">{t.description}</p>
              )}

              <Checkbox
                checked={draft.enabled}
                onChange={(v) => patch(t.type_key, { enabled: v })}
                label="Notification active"
                description="Désactivée, aucun destinataire ne la reçoit."
              />

              <div>
                <p className="text-label-md font-semibold text-on-surface-variant uppercase tracking-wide mb-1.5">
                  Canaux de diffusion
                </p>
                <div className="flex flex-wrap gap-x-6">
                  {t.available_channels.map((ch) => (
                    <Checkbox
                      key={ch}
                      checked={draft.channels.includes(ch)}
                      onChange={() => toggleChannel(t.type_key, ch)}
                      label={channelLabel(ch)}
                    />
                  ))}
                </div>
              </div>

              <div>
                <p className="text-label-md font-semibold text-on-surface-variant uppercase tracking-wide mb-1.5">
                  Destinataires — groupes
                </p>
                <MultiSelect
                  options={groupOptions}
                  selectedIds={draft.recipient_group_ids}
                  onChange={(ids) =>
                    patch(t.type_key, { recipient_group_ids: ids.map(Number) })
                  }
                  placeholder="Ajouter un groupe…"
                  emptyLabel="Aucun groupe."
                />
              </div>

              <div>
                <p className="text-label-md font-semibold text-on-surface-variant uppercase tracking-wide mb-1.5">
                  Destinataires — permissions
                </p>
                <MultiSelect
                  options={permissionOptions}
                  selectedIds={draft.recipient_permissions}
                  onChange={(ids) =>
                    patch(t.type_key, { recipient_permissions: ids.map(String) })
                  }
                  placeholder="Ajouter une permission…"
                  emptyLabel="Aucune permission."
                />
                <p className="text-label-sm text-on-surface-variant/70 mt-1.5">
                  Les destinataires sont l'union des membres des groupes et des permissions
                  sélectionnés.
                </p>
              </div>

              <div className="flex items-center gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => save(t.type_key)}
                  disabled={savingKey === t.type_key}
                  className="inline-flex items-center rounded-full bg-primary px-4 py-2 text-label-md font-medium text-on-primary hover:bg-primary-container transition-colors disabled:opacity-60"
                >
                  {savingKey === t.type_key ? "Enregistrement…" : "Enregistrer"}
                </button>
                {savedKey === t.type_key && (
                  <span className="inline-flex items-center gap-1 text-label-md text-secondary">
                    <CheckCircleOutlined style={{ fontSize: 16 }} />
                    Enregistré
                  </span>
                )}
              </div>
            </div>
          </Accordion>
        );
      })}
    </div>
  );
}
