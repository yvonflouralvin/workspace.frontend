"use client";

import { useEffect, useMemo, useState } from "react";
import { SearchOutlined, StorageOutlined } from "@mui/icons-material";
import { DashboardShell } from "@/components/DashboardShell";
import { getSources, type DataSourceApp } from "@/lib/dashboard-api";
import { accentFor } from "@/lib/app-accent";

export default function SourcesPage() {
  const [sources, setSources] = useState<DataSourceApp[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState("");

  useEffect(() => {
    getSources()
      .then((r) => setSources(r.sources))
      .catch((e) => setError(e instanceof Error ? e.message : "Erreur de chargement."))
      .finally(() => setLoading(false));
  }, []);

  const query = q.trim().toLowerCase();
  const filtered = useMemo(
    () =>
      sources
        .map((s) => ({
          ...s,
          models: query
            ? s.models.filter(
                (m) =>
                  m.name.toLowerCase().includes(query) ||
                  m.fields.some((f) => f.name.toLowerCase().includes(query)),
              )
            : s.models,
        }))
        .filter((s) => s.models.length > 0),
    [sources, query],
  );

  return (
    <DashboardShell>
      <div className="p-6 max-w-[1100px] mx-auto w-full">
        <div className="mb-6">
          <h1 className="text-headline-lg font-display text-on-surface">Sources de données</h1>
          <p className="mt-1 text-body-md text-on-surface-variant">
            Les modèles exposés par chaque application, leurs champs et leurs types.
          </p>
        </div>

        <div className="relative mb-6 max-w-md">
          <SearchOutlined
            style={{ fontSize: 18 }}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant"
          />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Filtrer un modèle ou un champ…"
            className="w-full rounded-xl border border-outline-variant bg-surface-container-lowest py-2 pl-9 pr-3 text-body-sm text-on-surface focus:border-primary focus:outline-none"
          />
        </div>

        {error && (
          <p className="mb-4 rounded-xl bg-error-container/40 px-4 py-3 text-body-sm text-error">{error}</p>
        )}

        {loading ? (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-14 animate-pulse rounded-xl bg-surface-container" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex h-56 flex-col items-center justify-center gap-3 text-center">
            <StorageOutlined style={{ fontSize: 40 }} className="text-on-surface-variant/30" />
            <p className="text-body-md text-on-surface-variant">
              {sources.length === 0 ? "Aucune source de données enregistrée." : "Aucun résultat."}
            </p>
          </div>
        ) : (
          <div className="space-y-8">
            {filtered.map((src) => (
              <section key={src.app_key}>
                <div className="mb-3 flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ background: accentFor(src.app_key) }} />
                  <h2 className="font-display text-headline-sm text-on-surface">{src.app_label}</h2>
                  <span className="text-label-md text-on-surface-variant">
                    · {src.models.length} modèle{src.models.length > 1 ? "s" : ""}
                  </span>
                </div>

                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  {src.models.map((m) => (
                    <details
                      key={m.name}
                      className="overflow-hidden rounded-xl border border-outline-variant bg-surface-container-lowest"
                    >
                      <summary className="flex cursor-pointer select-none items-center justify-between px-4 py-3 hover:bg-surface-container-low">
                        <span className="font-mono text-body-md font-medium text-on-surface">{m.name}</span>
                        <span className="text-label-md text-on-surface-variant">{m.fields.length} champs</span>
                      </summary>
                      <div className="overflow-x-auto border-t border-outline-variant/60">
                        <table className="w-full text-body-sm">
                          <tbody>
                            {m.fields.map((f) => (
                              <tr key={f.name} className="border-b border-outline-variant/40 last:border-0">
                                <td className="px-4 py-2 font-mono text-body-sm text-on-surface">{f.name}</td>
                                <td className="px-4 py-2 align-top">
                                  <span className="inline-flex rounded-md bg-surface-container px-1.5 py-0.5 text-label-sm text-on-surface-variant">
                                    {f.type}
                                    {f.nullable ? " ?" : ""}
                                  </span>
                                </td>
                                <td className="px-4 py-2">
                                  {f.values && f.values.length > 0 ? (
                                    <div className="flex flex-wrap gap-1">
                                      {f.values.map((v) => (
                                        <span
                                          key={v}
                                          className="rounded-md bg-primary/10 px-1.5 py-0.5 text-label-sm text-primary"
                                        >
                                          {v}
                                        </span>
                                      ))}
                                    </div>
                                  ) : null}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </details>
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>
    </DashboardShell>
  );
}
