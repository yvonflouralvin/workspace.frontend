"use client";

import { useState } from "react";
import { RightDrawer } from "@repo/ui/RightDrawer";
import { updateNotificationChannelConfig, ApiError } from "@/app/lib/api";
import type { NotificationChannel, NotificationChannelConfig } from "@/app/lib/types";

const CHANNEL_LABELS: Record<NotificationChannel, string> = {
  email: "Email",
  sms: "SMS",
  whatsapp: "WhatsApp",
};

const CHANNEL_FIELDS: Record<
  NotificationChannel,
  { key: string; label: string; type: "text" | "password" }[]
> = {
  email: [
    { key: "host", label: "Hôte SMTP", type: "text" },
    { key: "port", label: "Port", type: "text" },
    { key: "username", label: "Nom d'utilisateur", type: "text" },
    { key: "password", label: "Mot de passe", type: "password" },
    { key: "from_email", label: "Adresse d'expédition", type: "text" },
  ],
  sms: [
    { key: "provider", label: "Fournisseur", type: "text" },
    { key: "api_key", label: "Clé API", type: "text" },
    { key: "api_secret", label: "Secret API", type: "password" },
    { key: "sender_id", label: "Expéditeur", type: "text" },
  ],
  whatsapp: [
    { key: "provider", label: "Fournisseur", type: "text" },
    { key: "phone_number_id", label: "ID du numéro de téléphone", type: "text" },
    { key: "access_token", label: "Token d'accès", type: "password" },
    { key: "business_account_id", label: "ID du compte business", type: "text" },
  ],
};

export function NotificationChannelDrawer({
  workspaceId,
  channelConfig,
  onClose,
  onSaved,
}: {
  workspaceId: number;
  channelConfig: NotificationChannelConfig;
  onClose: () => void;
  onSaved: (updated: NotificationChannelConfig) => void;
}) {
  const fields = CHANNEL_FIELDS[channelConfig.channel];
  const [values, setValues] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    for (const field of fields) {
      initial[field.key] = channelConfig.config?.[field.key] ?? "";
    }
    return initial;
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      const updated = await updateNotificationChannelConfig(workspaceId, channelConfig.channel, values);
      onSaved(updated);
      onClose();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Une erreur est survenue");
    } finally {
      setSaving(false);
    }
  }

  return (
    <RightDrawer
      title={`Notifications — ${CHANNEL_LABELS[channelConfig.channel]}`}
      onClose={onClose}
      width="md:w-[400px] md:max-w-[92vw]"
      footer={
        <>
          <button
            onClick={onClose}
            className="h-[34px] px-3.5 rounded-lg border border-outline-soft text-label-md font-semibold text-on-surface-variant hover:bg-surface-container-low transition-colors"
          >
            Annuler
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="ml-auto h-[34px] px-4 rounded-lg bg-primary text-on-primary text-label-md font-semibold shadow-button hover:bg-primary-container disabled:opacity-50 transition-colors"
          >
            {saving ? "Enregistrement…" : "Enregistrer"}
          </button>
        </>
      }
    >
      <div className="space-y-4">
        {fields.map((field) => (
          <div key={field.key}>
            <label className="block text-[11px] font-semibold text-on-surface-variant mb-1.5">
              {field.label}
            </label>
            <input
              type={field.type}
              value={values[field.key]}
              onChange={(e) => setValues((prev) => ({ ...prev, [field.key]: e.target.value }))}
              className="w-full h-9 px-3 rounded-lg border border-outline-soft bg-surface-container-lowest text-body-sm text-on-surface outline-none focus:border-primary transition-colors"
            />
          </div>
        ))}

        {error && (
          <p className="text-body-sm text-error bg-error-container/40 rounded-lg px-3 py-2">{error}</p>
        )}
      </div>
    </RightDrawer>
  );
}

export const NOTIFICATION_CHANNEL_LABELS = CHANNEL_LABELS;
