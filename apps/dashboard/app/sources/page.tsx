"use client";

import { useEffect, useState } from "react";
import {
  ExpandMoreOutlined,
  ChevronRightOutlined,
  StorageOutlined,
} from "@mui/icons-material";
import { RightDrawer } from "@repo/ui/RightDrawer";
import { DashboardShell } from "@/components/DashboardShell";
import {
  getSources,
  type DataSourceApp,
  type SourceModel,
} from "@/lib/dashboard-api";
import { accentFor } from "@/lib/app-accent";

type Selected = { app: DataSourceApp; model: SourceModel };

export default function SourcesPage() {
  const [sources, setSources] = useState<DataSourceApp[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openApps, setOpenApps] = useState<Set<string>>(new Set());
  const [selected, setSelected] = useState<Selected | null>(null);

  useEffect(() => {
    getSources()
      .then((r) => {
        setSources(r.sources);
        if (r.sources[0]) setOpenApps(new Set([r.sources[0].app_key]));
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Erreur de chargement."))
      .finally(() => setLoading(false));
  }, []);

  function toggleApp(key: string) {
    setOpenApps((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  return (
    <DashboardShell>
      <div className="p-6 max-w-[900px] mx-auto w-full">
        <div className="mb-6">
          <h1 className="text-headline-lg font-display text-on-surface">Sources de données</h1>
          <p className="mt-1 text-body-md text-on-surface-variant">
            Les modèles exposés par chaque application. Cliquez un modèle pour voir ses champs.
          </p>
        </div>

        {error && (
          <p className="mb-4 rounded-xl bg-error-container/40 px-4 py-3 text-body-sm text-error">{error}</p>
        )}

        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="h-16 animate-pulse rounded-2xl bg-surface-container" />
            ))}
          </div>
        ) : sources.length === 0 ? (
          <div className="flex h-56 flex-col items-center justify-center gap-3 text-center">
            <StorageOutlined style={{ fontSize: 40 }} className="text-on-surface-variant/30" />
            <p className="text-body-md text-on-surface-variant">Aucune source de données enregistrée.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {sources.map((src) => {
              const open = openApps.has(src.app_key);
              return (
                <div
                  key={src.app_key}
                  className="overflow-hidden rounded-2xl border border-outline-variant bg-surface-container-lowest"
                >
                  <button
                    type="button"
                    onClick={() => toggleApp(src.app_key)}
                    className="flex w-full items-center justify-between px-5 py-4 text-left transition-colors hover:bg-surface-container-low"
                  >
                    <div className="flex items-center gap-3">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ background: accentFor(src.app_key) }} />
                      <span className="font-display text-headline-sm text-on-surface">{src.app_label}</span>
                      <span className="text-label-md text-on-surface-variant">
                        {src.models.length} modèle{src.models.length > 1 ? "s" : ""}
                      </span>
                    </div>
                    <ExpandMoreOutlined
                      style={{ fontSize: 22 }}
                      className={`text-on-surface-variant transition-transform ${open ? "rotate-180" : ""}`}
                    />
                  </button>

                  {open && (
                    <div className="divide-y divide-outline-variant/40 border-t border-outline-variant/60">
                      {src.models.map((m) => (
                        <button
                          key={m.name}
                          type="button"
                          onClick={() => setSelected({ app: src, model: m })}
                          className="flex w-full items-center justify-between px-5 py-3 text-left transition-colors hover:bg-surface-container-low"
                        >
                          <span className="font-mono text-body-md text-on-surface">{m.name}</span>
                          <span className="flex items-center gap-1 text-label-md text-on-surface-variant">
                            {m.fields.length} champs
                            <ChevronRightOutlined style={{ fontSize: 18 }} />
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {selected && (
        <RightDrawer title={selected.model.name} onClose={() => setSelected(null)}>
          <div className="h-full overflow-y-auto">
            <p className="mb-4 text-body-sm text-on-surface-variant">
              {selected.app.app_label} · {selected.model.fields.length} champs
            </p>
            <div className="overflow-hidden rounded-xl border border-outline-variant">
              <table className="w-full text-body-sm">
                <thead>
                  <tr className="border-b border-outline-variant text-left">
                    <th className="px-4 py-2.5 text-label-sm font-medium uppercase tracking-wide text-on-surface-variant/70">Champ</th>
                    <th className="px-4 py-2.5 text-label-sm font-medium uppercase tracking-wide text-on-surface-variant/70">Type</th>
                    <th className="px-4 py-2.5 text-label-sm font-medium uppercase tracking-wide text-on-surface-variant/70">Valeurs</th>
                  </tr>
                </thead>
                <tbody>
                  {selected.model.fields.map((f) => (
                    <tr key={f.name} className="border-b border-outline-variant/40 last:border-0 align-top">
                      <td className="px-4 py-2.5 font-mono text-on-surface">{f.name}</td>
                      <td className="px-4 py-2.5">
                        <span className="inline-flex rounded-md bg-surface-container px-1.5 py-0.5 text-label-sm text-on-surface-variant">
                          {f.type}
                          {f.nullable ? " ?" : ""}
                        </span>
                      </td>
                      <td className="px-4 py-2.5">
                        {f.values && f.values.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {f.values.map((v) => (
                              <span key={v} className="rounded-md bg-primary/10 px-1.5 py-0.5 text-label-sm text-primary">
                                {v}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-on-surface-variant/40">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </RightDrawer>
      )}
    </DashboardShell>
  );
}
