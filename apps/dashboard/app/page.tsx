"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { QueryStatsOutlined } from "@mui/icons-material";
import { DashboardHomeWidget, type HomeWidget } from "@repo/reporting-widgets/DashboardHomeWidget";
import { DashboardShell } from "@/components/DashboardShell";
import { getHome } from "@/lib/dashboard-api";

export default function Page() {
  const router = useRouter();
  const [widgets, setWidgets] = useState<HomeWidget[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    getHome()
      .then((r) => {
        setWidgets(r.widgets);
        setError(null);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Erreur de chargement."))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
    const id = setInterval(load, 30000);
    return () => clearInterval(id);
  }, [load]);

  return (
    <DashboardShell>
      <div className="p-6 max-w-[1400px] mx-auto w-full">
        <div className="mb-6">
          <h1 className="text-headline-lg font-display text-on-surface">Tableau de bord</h1>
          <p className="text-body-md text-on-surface-variant mt-1">
            Vue d&apos;ensemble temps réel — cliquez un domaine pour l&apos;explorer.
          </p>
        </div>

        {error && (
          <p className="text-body-sm text-error bg-error-container/40 rounded-xl px-4 py-3 mb-4">{error}</p>
        )}

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-40 rounded-2xl bg-surface-container animate-pulse" />
            ))}
          </div>
        ) : widgets.length === 0 ? (
          <div className="h-64 flex flex-col items-center justify-center gap-3 text-center">
            <QueryStatsOutlined style={{ fontSize: 40 }} className="text-on-surface-variant/30" />
            <p className="text-body-md text-on-surface-variant">
              Aucun domaine de reporting disponible pour ce workspace.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {widgets.map((w) => (
              <DashboardHomeWidget
                key={`${w.provider}:${w.domain_key}`}
                label={w.label}
                appLabel={w.app_label}
                description={w.description}
                stats={w.stats}
                onClick={() => router.push(w.href)}
              />
            ))}
          </div>
        )}
      </div>
    </DashboardShell>
  );
}
