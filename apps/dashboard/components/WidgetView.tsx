"use client";

import { ComparisonView } from "@repo/reporting-widgets/ComparisonView";
import { TimeseriesView } from "@repo/reporting-widgets/TimeseriesView";
import { TrendView } from "@repo/reporting-widgets/TrendView";
import { GaugeView } from "@repo/reporting-widgets/GaugeView";
import { LeaderboardView } from "@repo/reporting-widgets/LeaderboardView";
import { RatioView } from "@repo/reporting-widgets/RatioView";
import type { WidgetData } from "@/lib/dashboard-api";

const nf = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 2 });

// Rendu de la valeur d'un widget (aiguillage par type). Réutilisé par la vue détaillée.
export function WidgetView({ data }: { data?: WidgetData }) {
  if (data === undefined) return <div className="h-10 w-32 animate-pulse rounded bg-surface-container" />;
  switch (data.type) {
    case "comparison":
    case "groupby":
      return <ComparisonView render={data.render} series={data.series} />;
    case "timeseries":
      return <TimeseriesView points={data.points} granularity={data.granularity} />;
    case "trend":
      return <TrendView value={data.value} previous={data.previous} points={data.points} />;
    case "gauge":
      return <GaugeView value={data.value} target={data.target} direction={data.direction} thresholds={data.thresholds} />;
    case "table":
      return <LeaderboardView rows={data.rows} />;
    case "ratio":
      return <RatioView numerator={data.numerator} denominator={data.denominator} percent={data.percent} format={data.format} />;
    default:
      return <p className="text-4xl font-bold leading-none text-on-surface tabular-nums">{data.value === null ? "—" : nf.format(data.value)}</p>;
  }
}
