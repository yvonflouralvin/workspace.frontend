"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { AddOutlined, BarChartOutlined, CategoryOutlined, DeleteOutlined, EditOutlined, ExpandMoreOutlined, GridOnOutlined, LeaderboardOutlined, NumbersOutlined, PercentOutlined, ReadMoreOutlined, SpeedOutlined, StarOutlineOutlined, StarOutlined, TimelineOutlined, TrendingUpOutlined, WidgetsOutlined } from "@mui/icons-material";
import { ComparisonView } from "@repo/reporting-widgets/ComparisonView";
import { TimeseriesView } from "@repo/reporting-widgets/TimeseriesView";
import { TrendView } from "@repo/reporting-widgets/TrendView";
import { GaugeView } from "@repo/reporting-widgets/GaugeView";
import { LeaderboardView } from "@repo/reporting-widgets/LeaderboardView";
import { RatioView } from "@repo/reporting-widgets/RatioView";
import { PivotView } from "@/components/PivotView";
import { DashboardShell } from "@/components/DashboardShell";
import { PeriodFilter } from "@/components/PeriodFilter";
import { WIDGET_TYPES } from "@/components/WidgetForm";
import { getWidgets, deleteWidget, getWidgetData, updateWidget, type Widget, type WidgetData } from "@/lib/dashboard-api";
import { REFRESH_OPTIONS } from "@/lib/periods";
import { accentFor } from "@/lib/app-accent";

const nf = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 2 });

const TYPE_ICONS: Record<string, ReactNode> = {
  count: <NumbersOutlined style={{ fontSize: 18 }} />,
  trend: <TrendingUpOutlined style={{ fontSize: 18 }} />,
  gauge: <SpeedOutlined style={{ fontSize: 18 }} />,
  comparison: <BarChartOutlined style={{ fontSize: 18 }} />,
  timeseries: <TimelineOutlined style={{ fontSize: 18 }} />,
  groupby: <CategoryOutlined style={{ fontSize: 18 }} />,
  table: <LeaderboardOutlined style={{ fontSize: 18 }} />,
  ratio: <PercentOutlined style={{ fontSize: 18 }} />,
  pivot: <GridOnOutlined style={{ fontSize: 18 }} />,
};

export default function WidgetsPage() {
  const router = useRouter();
  const [widgets, setWidgets] = useState<Widget[]>([]);
  const [dataById, setDataById] = useState<Record<number, WidgetData | undefined>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [refreshMs, setRefreshMs] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const [tagFilter, setTagFilter] = useState("");
  const [favOnly, setFavOnly] = useState(false);

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

  useEffect(() => {
    if (!refreshMs) return;
    const t = setInterval(() => widgets.forEach((w) => fetchData(w.id)), refreshMs);
    return () => clearInterval(t);
  }, [refreshMs, widgets, fetchData]);

  async function handleDelete(id: number) {
    setWidgets((prev) => prev.filter((w) => w.id !== id));
    await deleteWidget(id).catch(() => load());
  }

  const cfgOf = (w: Widget) => (w.config ?? {}) as { tags?: string[]; favorite?: boolean };
  const allTags = Array.from(new Set(widgets.flatMap((w) => cfgOf(w).tags ?? []))).sort();
  const visible = widgets
    .filter((w) => (!tagFilter || (cfgOf(w).tags ?? []).includes(tagFilter)) && (!favOnly || cfgOf(w).favorite))
    .sort((a, b) => Number(!!cfgOf(b).favorite) - Number(!!cfgOf(a).favorite));

  async function toggleFav(w: Widget) {
    const next = { ...w, config: { ...w.config, favorite: !cfgOf(w).favorite } };
    setWidgets((prev) => prev.map((x) => (x.id === w.id ? next : x)));
    await updateWidget(w.id, { type: w.type, title: w.title, provider: w.provider, model: w.model, config: next.config }).catch(() => load());
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
            <PeriodFilter from={from} to={to} onChange={(f, t) => { setFrom(f); setTo(t); }} />
            <select value={refreshMs} onChange={(e) => setRefreshMs(Number(e.target.value))}
              className="rounded-xl border border-outline-variant bg-surface-container-lowest px-2.5 py-1.5 text-body-sm text-on-surface focus:border-primary focus:outline-none">
              {REFRESH_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
            <div className="relative">
              <button type="button" onClick={() => setMenuOpen((o) => !o)}
                className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-body-md font-medium text-on-primary transition-colors hover:bg-primary-container">
                <AddOutlined style={{ fontSize: 18 }} /> Créer un widget
                <ExpandMoreOutlined style={{ fontSize: 18 }} className={`transition-transform ${menuOpen ? "rotate-180" : ""}`} />
              </button>
              {menuOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
                  <div className="absolute right-0 top-full z-50 mt-2 w-56 rounded-xl border border-outline-variant bg-surface-container-lowest p-1 shadow-lg">
                    <p className="px-3 py-1.5 text-label-sm uppercase tracking-wide text-on-surface-variant/60">Type de widget</p>
                    {WIDGET_TYPES.map((t) => (
                      <button key={t.value} type="button"
                        onClick={() => { setMenuOpen(false); router.push(`/widgets/new?type=${t.value}`); }}
                        className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-body-md text-on-surface transition-colors hover:bg-surface-container">
                        <span className="text-on-surface-variant">{TYPE_ICONS[t.value]}</span>
                        {t.label}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {error && <p className="mb-4 rounded-xl bg-error-container/40 px-4 py-3 text-body-sm text-error">{error}</p>}

        {widgets.length > 0 && (
          <div className="mb-4 flex flex-wrap items-center gap-3">
            {allTags.length > 0 && (
              <select value={tagFilter} onChange={(e) => setTagFilter(e.target.value)}
                className="rounded-xl border border-outline-variant bg-surface-container-lowest px-2.5 py-1.5 text-body-sm text-on-surface focus:border-primary focus:outline-none">
                <option value="">Toutes les étiquettes</option>
                {allTags.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            )}
            <label className="flex items-center gap-1.5 text-label-md text-on-surface-variant">
              <input type="checkbox" checked={favOnly} onChange={(e) => setFavOnly(e.target.checked)} /> Favoris uniquement
            </label>
          </div>
        )}

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
            {visible.map((w) => (
              <WidgetTile key={w.id} widget={w} data={dataById[w.id]} isFav={!!cfgOf(w).favorite} onToggleFav={() => toggleFav(w)} onView={() => router.push(`/widgets/${w.id}`)} onEdit={() => router.push(`/widgets/${w.id}/edit`)} onDelete={() => handleDelete(w.id)} />
            ))}
          </div>
        )}
      </div>
    </DashboardShell>
  );
}

function WidgetTile({ widget, data, isFav, onToggleFav, onView, onEdit, onDelete }: { widget: Widget; data?: WidgetData; isFav: boolean; onToggleFav: () => void; onView: () => void; onEdit: () => void; onDelete: () => void }) {
  const accent = accentFor(widget.provider ?? "");
  const isComparison = widget.type === "comparison";
  const isTimeseries = widget.type === "timeseries";
  const isGroupby = widget.type === "groupby";
  const isTrend = widget.type === "trend";
  const isGauge = widget.type === "gauge";
  const isTable = widget.type === "table";
  const isRatio = widget.type === "ratio";
  const isPivot = widget.type === "pivot";
  const cfg = widget.config as { conditions?: unknown[]; series?: unknown[]; group_by?: string };
  const caption = isComparison
    ? `Comparaison · ${Array.isArray(cfg?.series) ? cfg.series.length : 0} source(s)`
    : isRatio
      ? "Ratio / pourcentage"
      : `${widget.provider} · ${widget.model}${(isGroupby || isTable) && cfg.group_by ? ` · par ${cfg.group_by}` : ""}${Array.isArray(cfg?.conditions) && cfg.conditions.length ? ` · ${cfg.conditions.length} cond.` : ""}`;

  return (
    <div className="group relative flex flex-col gap-3 rounded-2xl border border-outline-variant bg-surface-container-lowest p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-body-md font-semibold text-on-surface">{widget.title}</p>
          <p className="mt-0.5 truncate font-mono text-label-md text-on-surface-variant">{caption}</p>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <button type="button" onClick={onToggleFav} title={isFav ? "Retirer des favoris" : "Ajouter aux favoris"}
            className={`rounded-lg p-1 ${isFav ? "text-amber-500" : "text-on-surface-variant/40 hover:text-on-surface-variant"}`}>
            {isFav ? <StarOutlined style={{ fontSize: 18 }} /> : <StarOutlineOutlined style={{ fontSize: 18 }} />}
          </button>
          <span className="flex h-9 w-9 items-center justify-center rounded-xl"
            style={{ backgroundColor: `color-mix(in srgb, ${accent} 12%, transparent)`, color: accent }}>
            {isComparison ? <BarChartOutlined style={{ fontSize: 18 }} /> : isTimeseries ? <TimelineOutlined style={{ fontSize: 18 }} /> : isGroupby ? <CategoryOutlined style={{ fontSize: 18 }} /> : isTrend ? <TrendingUpOutlined style={{ fontSize: 18 }} /> : isGauge ? <SpeedOutlined style={{ fontSize: 18 }} /> : isTable ? <LeaderboardOutlined style={{ fontSize: 18 }} /> : isRatio ? <PercentOutlined style={{ fontSize: 18 }} /> : isPivot ? <GridOnOutlined style={{ fontSize: 18 }} /> : <NumbersOutlined style={{ fontSize: 18 }} />}
          </span>
        </div>
      </div>

      <div className="pb-4">
        {data === undefined ? (
          <div className="h-9 w-24 animate-pulse rounded bg-surface-container" />
        ) : data.type === "comparison" || data.type === "groupby" ? (
          <ComparisonView render={data.render} series={data.series} />
        ) : data.type === "timeseries" ? (
          <TimeseriesView points={data.points} granularity={data.granularity} />
        ) : data.type === "trend" ? (
          <TrendView value={data.value} previous={data.previous} points={data.points} />
        ) : data.type === "gauge" ? (
          <GaugeView value={data.value} target={data.target} direction={data.direction} thresholds={data.thresholds} />
        ) : data.type === "table" ? (
          <LeaderboardView rows={data.rows} />
        ) : data.type === "ratio" ? (
          <RatioView numerator={data.numerator} denominator={data.denominator} percent={data.percent} format={data.format} />
        ) : data.type === "pivot" ? (
          <PivotView cols={data.cols} rows={data.rows} render={data.render} />
        ) : (
          <p className="text-3xl font-bold leading-none text-on-surface tabular-nums">{data.value === null ? "—" : nf.format(data.value)}</p>
        )}
      </div>

      <button type="button" onClick={onView}
        className="mt-auto inline-flex w-fit items-center gap-1 text-label-md font-medium text-primary transition-opacity hover:opacity-70">
        <ReadMoreOutlined style={{ fontSize: 16 }} /> Voir plus
      </button>

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
