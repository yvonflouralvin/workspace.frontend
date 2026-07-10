"use client";

import { useCallback, useEffect, useState } from "react";
import { RefreshOutlined, QueryStatsOutlined } from "@mui/icons-material";
import { ReportWidget, type ReportData, type ReportDescriptor } from "@repo/reporting-widgets/ReportWidget";
import { DashboardShell } from "@/components/DashboardShell";
import { getContract, getReportData, type ContractDomain } from "@/lib/dashboard-api";

type Selection = { provider: string; report: ReportDescriptor };

function fmtTime(iso: string | null): string | null {
  if (!iso) return null;
  return new Date(iso).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

export default function Page() {
  const [domains, setDomains] = useState<ContractDomain[]>([]);
  const [selected, setSelected] = useState<Selection | null>(null);
  const [data, setData] = useState<ReportData | null>(null);
  const [loadingContract, setLoadingContract] = useState(true);
  const [loadingData, setLoadingData] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generatedAt, setGeneratedAt] = useState<string | null>(null);

  useEffect(() => {
    getContract()
      .then((contract) => {
        setDomains(contract.domains);
        const firstDomain = contract.domains[0];
        const firstReport = firstDomain?.reports[0];
        if (firstDomain && firstReport) {
          setSelected({ provider: firstDomain.provider, report: firstReport });
        }
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Erreur de chargement du contrat."))
      .finally(() => setLoadingContract(false));
  }, []);

  const loadData = useCallback((sel: Selection) => {
    setLoadingData(true);
    getReportData(sel.provider, sel.report.report_key)
      .then((d) => {
        setData(d);
        setGeneratedAt(d.generated_at ?? null);
        setError(null);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Erreur de chargement des données."))
      .finally(() => setLoadingData(false));
  }, []);

  useEffect(() => {
    if (!selected) return;
    loadData(selected);
    const interval = selected.report.refresh_interval_seconds;
    if (!interval || interval <= 0) return;
    const id = setInterval(() => loadData(selected), interval * 1000);
    return () => clearInterval(id);
  }, [selected, loadData]);

  const hasReports = domains.some((d) => d.reports.length > 0);

  return (
    <DashboardShell>
      <div className="flex flex-col lg:flex-row gap-6 p-6 max-w-[1400px] mx-auto w-full">
        {/* ── Liste des rapports ── */}
        <aside className="lg:w-72 shrink-0 space-y-4">
          <div>
            <h1 className="text-headline-sm font-display text-on-surface">Rapports</h1>
            <p className="text-body-sm text-on-surface-variant mt-0.5">Temps réel, à la source</p>
          </div>

          {loadingContract ? (
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-9 rounded-xl bg-surface-container animate-pulse" />
              ))}
            </div>
          ) : !hasReports ? (
            <p className="text-body-sm text-on-surface-variant/70 rounded-xl border border-dashed border-outline-variant p-4">
              Aucun rapport disponible pour ce workspace.
            </p>
          ) : (
            <nav className="space-y-4">
              {domains.map((domain) => (
                <div key={`${domain.provider}:${domain.domain_key}`}>
                  <p className="text-label-sm uppercase tracking-wide text-on-surface-variant/60 px-2 mb-1">
                    {domain.app_label} · {domain.label}
                  </p>
                  <ul className="space-y-0.5">
                    {domain.reports.map((report) => {
                      const active =
                        selected?.provider === domain.provider &&
                        selected?.report.report_key === report.report_key;
                      return (
                        <li key={report.report_key}>
                          <button
                            type="button"
                            onClick={() => setSelected({ provider: domain.provider, report })}
                            className={`w-full text-left px-3 py-2 rounded-xl text-body-md transition-colors ${
                              active
                                ? "bg-primary text-on-primary font-medium"
                                : "text-on-surface-variant hover:bg-surface-container"
                            }`}
                          >
                            {report.label}
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))}
            </nav>
          )}
        </aside>

        {/* ── Rapport sélectionné ── */}
        <section className="flex-1 min-w-0">
          {selected ? (
            <>
              <div className="flex items-start justify-between gap-4 mb-4 flex-wrap">
                <div>
                  <h2 className="text-headline-sm font-display text-on-surface">{selected.report.label}</h2>
                  {selected.report.description && (
                    <p className="text-body-sm text-on-surface-variant mt-0.5">{selected.report.description}</p>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  {generatedAt && (
                    <span className="text-label-md text-on-surface-variant/70">
                      Mis à jour à {fmtTime(generatedAt)}
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => loadData(selected)}
                    disabled={loadingData}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-outline-variant text-body-sm text-on-surface-variant hover:bg-surface-container transition-colors disabled:opacity-50"
                  >
                    <RefreshOutlined style={{ fontSize: 16 }} className={loadingData ? "animate-spin" : ""} />
                    Actualiser
                  </button>
                </div>
              </div>

              {error && (
                <p className="text-body-sm text-error bg-error-container/40 rounded-xl px-4 py-3 mb-4">{error}</p>
              )}

              {!data && loadingData ? (
                <div className="h-64 rounded-2xl bg-surface-container animate-pulse" />
              ) : data ? (
                <ReportWidget report={selected.report} data={data} />
              ) : null}
            </>
          ) : (
            <div className="h-64 flex flex-col items-center justify-center gap-3 text-center">
              <QueryStatsOutlined style={{ fontSize: 40 }} className="text-on-surface-variant/30" />
              <p className="text-body-md text-on-surface-variant">
                {loadingContract ? "Chargement…" : "Sélectionnez un rapport."}
              </p>
              {error && <p className="text-body-sm text-error">{error}</p>}
            </div>
          )}
        </section>
      </div>
    </DashboardShell>
  );
}
