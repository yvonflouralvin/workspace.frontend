"use client";

import Link from "next/link";
import { usePermissions } from "@repo/auth/hooks/usePermissions";
import { NotificationSettings } from "@repo/notifications/NotificationSettings";
import { DashboardShell } from "@/components/DashboardShell";
import { ArrowBackOutlined } from "@mui/icons-material";

export default function NotificationsSettingsPage() {
  const { can } = usePermissions();
  const canManage = can("hosto.settings.manage");

  return (
    <DashboardShell>
      <div className="p-8 max-w-3xl mx-auto space-y-6">
        <div>
          <Link
            href="/parametres"
            className="inline-flex items-center gap-1.5 text-body-sm text-on-surface-variant hover:text-on-surface transition-colors"
          >
            <ArrowBackOutlined style={{ fontSize: 18 }} />
            Paramètres
          </Link>
          <h1 className="text-headline-md font-display text-on-surface mt-2">Notifications</h1>
          <p className="text-body-sm text-on-surface-variant mt-1">
            Pour chaque notification automatique, choisissez les canaux de diffusion et les
            destinataires (par groupes et/ou permissions).
          </p>
        </div>

        {!canManage ? (
          <p className="text-body-sm text-on-surface-variant bg-surface-container rounded-xl px-4 py-3">
            Accès restreint — vous n&apos;avez pas la permission d&apos;accéder aux paramètres.
          </p>
        ) : (
          <NotificationSettings
            appKey="hosto"
            permissionsPath="/api/notifications/permissions?app_key=hosto"
          />
        )}
      </div>
    </DashboardShell>
  );
}
