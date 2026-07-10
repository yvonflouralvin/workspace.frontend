"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowBackOutlined } from "@mui/icons-material";
import { ReportWidget, type ReportData } from "@repo/reporting-widgets/ReportWidget";
import { DashboardShell } from "@/components/DashboardShell";
import { getDomain, getReportData, type DomainDetail } from "@/lib/dashboard-api";
import { accentFor } from "@/lib/app-accent";

export default function DomainPage() {
  const params = useParams<{ provider: string; domain: string }>();
  const router = useRouter();
  const provider = params.provider;
  const domain = params.domain;

  const [detail, setDetail] = useState<DomainDetail | null>(null);
  const [dataByReport, setDataByReport] = useState<Record<string, ReportData>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    getDomain(provider, domain)
      .then(setDetail)
      .catch((e) => setError(e instanceof Error ? e.message : "Erreur de chargement."))
      .finally(() => setLoading(false));
  }, [provider, domain]);

  const loadReport = useCallback(
    (reportKey: string) => {
      getReportData(provider, reportKey)
        .then((d) => setDataByReport((prev) => ({ ...prev, [reportKey]: d })))
        .catch(() => {});
    },
    [provider],
  );

  useEffect(() => {
    if (!detail) return;
    detail.reports.forEach((r) => loadReport(r.report_key));
    const timers = detail.reports
      .filter((r) => r.refresh_interval_seconds && r.refresh_interval_seconds > 0)
      .map((r) => setInterval(() => loadReport(r.report_key), r.refresh_interval_seconds! * 1000));
    return () => timers.forEach((t) => clearInterval(t));
  }, [detail, loadReport]);

  return (
    <DashboardShell>
      <div className="p-6 max-w-[1400px] mx-auto w-full">
        <button
          type="button"
          onClick={() => router.push("/")}
          className="inline-flex items-center gap-1.5 text-body-sm text-on-surface-variant hover:text-on-surface transition-colors mb-4"
        >
          <ArrowBackOutlined style={{ fontSize: 18 }} />
          Tableau de bord
        </button>

        {error && (
          <p className="text-body-sm text-error bg-error-container/40 rounded-xl px-4 py-3 mb-4">{error}</p>
        )}

        {loading ? (
          <div className="h-64 rounded-2xl bg-surface-container animate-pulse" />
        ) : detail ? (
          <>
            <div className="mb-6">
              <p className="text-label-sm uppercase tracking-wide text-on-surface-variant/60">
                {detail.app_label}
              </p>
              <h1 className="text-headline-lg font-display text-on-surface">{detail.label}</h1>
            </div>

            {detail.reports.length === 0 ? (
              <p className="text-body-sm text-on-surface-variant/70 rounded-xl border border-dashed border-outline-variant p-6">
                Aucun rapport accessible dans ce domaine avec vos permissions.
              </p>
            ) : (
              <div className="space-y-8">
                {detail.reports.map((report) => (
                  <section key={report.report_key}>
                    <div className="mb-3">
                      <h2 className="text-headline-sm font-display text-on-surface">{report.label}</h2>
                      {report.description && (
                        <p className="text-body-sm text-on-surface-variant mt-0.5">{report.description}</p>
                      )}
                    </div>
                    {dataByReport[report.report_key] ? (
                      <ReportWidget report={report} data={dataByReport[report.report_key]!} accent={accentFor(provider)} />
                    ) : (
                      <div className="h-48 rounded-2xl bg-surface-container animate-pulse" />
                    )}
                  </section>
                ))}
              </div>
            )}
          </>
        ) : null}
      </div>
    </DashboardShell>
  );
}
