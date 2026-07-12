"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowBackOutlined, DownloadOutlined, EditOutlined, SearchOutlined } from "@mui/icons-material";
import { DashboardShell } from "@/components/DashboardShell";
import { PeriodFilter } from "@/components/PeriodFilter";
import { WidgetView } from "@/components/WidgetView";
import { AlertsPanel } from "@/components/AlertsPanel";
import { REFRESH_OPTIONS } from "@/lib/periods";
import { ALERTABLE_TYPES } from "@/lib/dashboard-api";
import {
  getWidget,
  getWidgetData,
  getWidgetRows,
  widgetExportUrl,
  type Widget,
  type WidgetData,
  type WidgetRowsResponse,
} from "@/lib/dashboard-api";

const nf = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 2 });

function cell(v: string | number | boolean | null): string {
  if (v === null || v === undefined) return "—";
  if (typeof v === "boolean") return v ? "oui" : "non";
  if (typeof v === "number") return nf.format(v);
  return String(v);
}

export default function WidgetDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = Number(params.id);

  const [widget, setWidget] = useState<Widget | null>(null);
  const [data, setData] = useState<WidgetData | undefined>(undefined);
  const [rows, setRows] = useState<WidgetRowsResponse | null>(null);
  const [rowsError, setRowsError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [qInput, setQInput] = useState("");
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [refreshMs, setRefreshMs] = useState(0);
  const [drill, setDrill] = useState<{ field: string; value: string } | null>(null);
  const pageSize = 25;

  const cfg = (widget?.config ?? {}) as { group?: { field?: string }; group_by?: string; row_group?: { field?: string } };
  const groupField = widget ? (widget.type === "pivot" ? cfg.row_group?.field : cfg.group?.field || cfg.group_by) : undefined;
  const drillKey = widget?.type === "pivot" ? "row" : "label";
  const drillable = !!widget && ["groupby", "table", "pivot"].includes(widget.type) && !!groupField;

  useEffect(() => {
    getWidget(id)
      .then(setWidget)
      .catch((e) => setError(e instanceof Error ? e.message : "Widget introuvable."))
      .finally(() => setLoading(false));
  }, [id]);

  // Débounce de la recherche.
  useEffect(() => {
    const t = setTimeout(() => { setQ(qInput.trim()); setPage(1); }, 350);
    return () => clearTimeout(t);
  }, [qInput]);

  // Le widget (haut) suit la période.
  useEffect(() => {
    if (!widget) return;
    getWidgetData(id, from || undefined, to || undefined)
      .then(setData)
      .catch(() => setData(undefined));
  }, [id, widget, from, to]);

  // Le tableau (bas) suit période + recherche + pagination.
  const loadRows = useCallback(() => {
    if (!widget) return;
    getWidgetRows(id, { from: from || undefined, to: to || undefined, q: q || undefined, page, page_size: pageSize, drill_field: drill?.field, drill_value: drill?.value })
      .then((r) => { setRows(r); setRowsError(null); })
      .catch((e) => { setRows(null); setRowsError(e instanceof Error ? e.message : "Erreur."); });
  }, [id, widget, from, to, q, page, drill]);

  useEffect(() => { loadRows(); }, [loadRows]);

  useEffect(() => {
    if (!refreshMs || !widget) return;
    const t = setInterval(() => {
      getWidgetData(id, from || undefined, to || undefined).then(setData).catch(() => {});
      loadRows();
    }, refreshMs);
    return () => clearInterval(t);
  }, [refreshMs, widget, id, from, to, loadRows]);

  const total = rows?.total ?? 0;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const detailAvailable = widget ? !["comparison", "ratio"].includes(widget.type) : false;
  const exportHref = useMemo(
    () => widgetExportUrl(id, { from: from || undefined, to: to || undefined, q: q || undefined, drill_field: drill?.field, drill_value: drill?.value }),
    [id, from, to, q, drill],
  );

  return (
    <DashboardShell>
      <div className="p-6 max-w-[1100px] mx-auto w-full">
        <div className="mb-4 flex items-center justify-between gap-3">
          <button type="button" onClick={() => router.push("/widgets")}
            className="inline-flex items-center gap-1.5 text-body-sm text-on-surface-variant transition-colors hover:text-on-surface">
            <ArrowBackOutlined style={{ fontSize: 18 }} /> Widgets
          </button>
          {widget && (
            <button type="button" onClick={() => router.push(`/widgets/${id}/edit`)}
              className="inline-flex items-center gap-1.5 rounded-xl border border-outline-variant px-3 py-1.5 text-body-sm text-on-surface-variant transition-colors hover:bg-surface-container hover:text-on-surface">
              <EditOutlined style={{ fontSize: 16 }} /> Modifier
            </button>
          )}
        </div>

        {error && <p className="mb-4 rounded-xl bg-error-container/40 px-4 py-3 text-body-sm text-error">{error}</p>}
        {loading && <div className="h-64 animate-pulse rounded-2xl bg-surface-container" />}

        {widget && (
          <>
            <div className="mb-4 flex flex-wrap items-end justify-between gap-4">
              <div>
                <h1 className="text-headline-lg font-display text-on-surface">{widget.title}</h1>
                <p className="mt-1 font-mono text-label-md text-on-surface-variant">{widget.provider}{widget.model ? ` · ${widget.model}` : ""}</p>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <PeriodFilter from={from} to={to} onChange={(f, t) => { setFrom(f); setTo(t); setPage(1); }} />
                <select value={refreshMs} onChange={(e) => setRefreshMs(Number(e.target.value))}
                  className="rounded-xl border border-outline-variant bg-surface-container-lowest px-2.5 py-1.5 text-body-sm text-on-surface focus:border-primary focus:outline-none">
                  {REFRESH_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
            </div>

            {/* Widget pleine largeur */}
            <div className="mb-6 rounded-2xl border border-outline-variant bg-surface-container-lowest p-6">
              <WidgetView data={data} />
            </div>

            {ALERTABLE_TYPES.includes(widget.type) && (
              <div className="mb-6">
                <AlertsPanel widgetId={id} />
              </div>
            )}

            {/* Tableau des données sous-jacentes */}
            <div className="rounded-2xl border border-outline-variant bg-surface-container-lowest">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-outline-variant p-4">
                <div className="min-w-0">
                  <p className="text-body-md font-semibold text-on-surface">Données détaillées</p>
                  <p className="text-label-md text-on-surface-variant">
                    {detailAvailable ? `${nf.format(total)} ligne(s)` : "—"}
                    {drillable && !drill ? " · cliquez une ligne pour voir le détail" : ""}
                  </p>
                </div>
                {detailAvailable && (
                  <div className="flex items-center gap-2">
                    <div className="relative">
                      <SearchOutlined style={{ fontSize: 18 }} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-on-surface-variant/50" />
                      <input value={qInput} onChange={(e) => setQInput(e.target.value)} placeholder="Rechercher…"
                        className="w-56 rounded-xl border border-outline-variant bg-surface-container-lowest py-1.5 pl-8 pr-3 text-body-sm text-on-surface focus:border-primary focus:outline-none" />
                    </div>
                    <a href={exportHref} download
                      className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-3 py-1.5 text-body-sm font-medium text-on-primary transition-colors hover:bg-primary-container">
                      <DownloadOutlined style={{ fontSize: 16 }} /> Télécharger
                    </a>
                  </div>
                )}
              </div>

              {drill && (
                <div className="flex items-center justify-between gap-2 border-b border-outline-variant bg-surface-container-low/40 px-4 py-2">
                  <p className="text-label-md text-on-surface-variant">Détail de <span className="font-medium text-on-surface">{drill.field} = {drill.value}</span> — enregistrements bruts</p>
                  <button type="button" onClick={() => { setDrill(null); setPage(1); }} className="text-label-md text-primary hover:opacity-70">↩ Revenir aux groupes</button>
                </div>
              )}

              {!detailAvailable ? (
                <p className="p-6 text-body-sm text-on-surface-variant">Le tableau détaillé n&apos;est pas disponible pour ce type de widget (plusieurs sources indépendantes).</p>
              ) : rowsError ? (
                <p className="p-6 text-body-sm text-error">{rowsError}</p>
              ) : rows === null ? (
                <div className="space-y-2 p-4">{Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-8 animate-pulse rounded bg-surface-container" />)}</div>
              ) : rows.rows.length === 0 ? (
                <p className="p-6 text-body-sm text-on-surface-variant">Aucune ligne.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full table-fixed text-body-sm">
                    <colgroup>
                      {rows.columns.map((c) => <col key={c.key} style={c.width ? { width: `${c.width}%` } : undefined} />)}
                    </colgroup>
                    <thead>
                      <tr className="border-b border-outline-variant text-left text-label-md text-on-surface-variant">
                        {rows.columns.map((c) => <th key={c.key} className="truncate px-4 py-2 font-medium">{c.label}</th>)}
                      </tr>
                    </thead>
                    <tbody>
                      {rows.rows.map((r, i) => {
                        const canDrill = drillable && !drill;
                        return (
                        <tr key={i}
                          onClick={canDrill ? () => { setDrill({ field: groupField as string, value: String(r[drillKey] ?? "") }); setPage(1); } : undefined}
                          className={`border-b border-outline-variant/50 last:border-0 ${canDrill ? "cursor-pointer hover:bg-surface-container/60" : ""}`}>
                          {rows.columns.map((c) => <td key={c.key} className="truncate px-4 py-2 text-on-surface tabular-nums" title={cell(r[c.key])}>{cell(r[c.key])}</td>)}
                        </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              {detailAvailable && rows && rows.rows.length > 0 && (
                <div className="flex items-center justify-between gap-3 border-t border-outline-variant p-3">
                  <p className="text-label-md text-on-surface-variant">Page {page} / {pageCount}</p>
                  <div className="flex gap-2">
                    <button type="button" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}
                      className="rounded-lg border border-outline-variant px-3 py-1.5 text-body-sm text-on-surface-variant transition-colors hover:bg-surface-container disabled:opacity-40">Précédent</button>
                    <button type="button" disabled={page >= pageCount} onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
                      className="rounded-lg border border-outline-variant px-3 py-1.5 text-body-sm text-on-surface-variant transition-colors hover:bg-surface-container disabled:opacity-40">Suivant</button>
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </DashboardShell>
  );
}
