"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AddOutlined, BarChartOutlined, DeleteOutlined, EditOutlined, NumbersOutlined, TimelineOutlined, WidgetsOutlined } from "@mui/icons-material";
import { ComparisonView } from "@repo/reporting-widgets/ComparisonView";
import { TimeseriesView } from "@repo/reporting-widgets/TimeseriesView";
import { DashboardShell } from "@/components/DashboardShell";
import { getWidgets, deleteWidget, getWidgetData, type Widget, type WidgetData } from "@/lib/dashboard-api";
import { accentFor } from "@/lib/app-accent";

const nf = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 2 });

export default function WidgetsPage() {
  const router = useRouter();
  const [widgets, setWidgets] = useState<Widget[]>([]);
  const [dataById, setDataById] = useState<Record<number, WidgetData | undefined>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const load = useCallback(() => {
    getWidgets()
      .then((r) => setWidgets(r.widgets))
      .catch((e) => setError(e instanceof Error ? e.message : "Erreur de chargement."))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const fetchData = useCallback(
    (id: number) => {
      getWidgetData(id, from || undefined, to || undefined)
        .then((d) => setDataById((prev) => ({ ...prev, [id]: d })))
        .catch(() => setDataById((prev) => ({ ...prev, [id]: undefined })));
    },
    [from, to],
  );

  useEffect(() => { widgets.forEach((w) => fetchData(w.id)); }, [widgets, fetchData]);

  async function handleDelete(id: number) {
    setWidgets((prev) => prev.filter((w) => w.id !== id));
    await deleteWidget(id).catch(() => load());
  }

  return (
    <DashboardShell>
      <div className="p-6 max-w-[1100px] mx-auto w-full">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-headline-lg font-display text-on-surface">Widgets</h1>
            <p className="mt-1 text-body-md text-on-surface-variant">Créez des widgets à partir de vos sources de données.</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <label className="flex items-center gap-1.5 text-label-md text-on-surface-variant">
              Du
              <input type="date" value={from} max={to || undefined} onChange={(e) => setFrom(e.target.value)}
                className="rounded-xl border border-outline-variant bg-surface-container-lowest px-2.5 py-1.5 text-body-sm text-on-surface focus:border-primary focus:outline-none" />
            </label>
            <label className="flex items-center gap-1.5 text-label-md text-on-surface-variant">
              Au
              <input type="date" value={to} min={from || undefined} onChange={(e) => setTo(e.target.value)}
                className="rounded-xl border border-outline-variant bg-surface-container-lowest px-2.5 py-1.5 text-body-sm text-on-surface focus:border-primary focus:outline-none" />
            </label>
            {(from || to) && (
              <button type="button" onClick={() => { setFrom(""); setTo(""); }} className="text-label-md text-primary hover:opacity-70">Réinitialiser</button>
            )}
            <button type="button" onClick={() => router.push("/widgets/new")}
              className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-body-md font-medium text-on-primary transition-colors hover:bg-primary-container">
              <AddOutlined style={{ fontSize: 18 }} /> Créer un widget
            </button>
          </div>
        </div>

        {error && <p className="mb-4 rounded-xl bg-error-container/40 px-4 py-3 text-body-sm text-error">{error}</p>}

        {loading ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-32 animate-pulse rounded-2xl bg-surface-container" />)}
          </div>
        ) : widgets.length === 0 ? (
          <div className="flex h-64 flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-outline-variant text-center">
            <WidgetsOutlined style={{ fontSize: 40 }} className="text-on-surface-variant/30" />
            <p className="text-body-md text-on-surface-variant">Aucun widget pour l&apos;instant.</p>
            <button type="button" onClick={() => router.push("/widgets/new")} className="text-body-sm text-primary underline underline-offset-2 hover:opacity-70">Créer votre premier widget</button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {widgets.map((w) => (
              <WidgetTile key={w.id} widget={w} data={dataById[w.id]} onEdit={() => router.push(`/widgets/${w.id}/edit`)} onDelete={() => handleDelete(w.id)} />
            ))}
          </div>
        )}
      </div>
    </DashboardShell>
  );
}

function WidgetTile({ widget, data, onEdit, onDelete }: { widget: Widget; data?: WidgetData; onEdit: () => void; onDelete: () => void }) {
  const accent = accentFor(widget.provider ?? "");
  const isComparison = widget.type === "comparison";
  const isTimeseries = widget.type === "timeseries";
  const cfg = widget.config as { conditions?: unknown[]; series?: unknown[] };
  const caption = isComparison
    ? `Comparaison · ${Array.isArray(cfg?.series) ? cfg.series.length : 0} source(s)`
    : `${widget.provider} · ${widget.model}${Array.isArray(cfg?.conditions) && cfg.conditions.length ? ` · ${cfg.conditions.length} cond.` : ""}`;

  return (
    <div className="group relative flex flex-col gap-3 rounded-2xl border border-outline-variant bg-surface-container-lowest p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-body-md font-semibold text-on-surface">{widget.title}</p>
          <p className="mt-0.5 truncate font-mono text-label-md text-on-surface-variant">{caption}</p>
        </div>
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
          style={{ backgroundColor: `color-mix(in srgb, ${accent} 12%, transparent)`, color: accent }}>
          {isComparison ? <BarChartOutlined style={{ fontSize: 18 }} /> : isTimeseries ? <TimelineOutlined style={{ fontSize: 18 }} /> : <NumbersOutlined style={{ fontSize: 18 }} />}
        </span>
      </div>

      <div className="pb-4">
        {data === undefined ? (
          <div className="h-9 w-24 animate-pulse rounded bg-surface-container" />
        ) : data.type === "comparison" ? (
          <ComparisonView render={data.render} series={data.series} />
        ) : data.type === "timeseries" ? (
          <TimeseriesView points={data.points} granularity={data.granularity} />
        ) : (
          <p className="text-3xl font-bold leading-none text-on-surface tabular-nums">{data.value === null ? "—" : nf.format(data.value)}</p>
        )}
      </div>

      <div className="absolute bottom-3 right-3 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
        <button type="button" onClick={onEdit} title="Modifier"
          className="rounded-lg p-1.5 text-on-surface-variant/50 transition-colors hover:bg-surface-container hover:text-on-surface">
          <EditOutlined style={{ fontSize: 16 }} />
        </button>
        <button type="button" onClick={onDelete} title="Supprimer"
          className="rounded-lg p-1.5 text-on-surface-variant/50 transition-colors hover:bg-error/8 hover:text-error">
          <DeleteOutlined style={{ fontSize: 16 }} />
        </button>
      </div>
    </div>
  );
}
