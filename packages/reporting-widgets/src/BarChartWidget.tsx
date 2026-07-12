import { BarChart } from "@repo/ui/charts/BarChart";
import type { ReportSeries } from "./types";

export interface BarChartWidgetProps {
  series: ReportSeries;
  color?: string;
}

export function BarChartWidget({ series, color }: BarChartWidgetProps) {
  const data = series.points.map((p) => ({ label: p.t, value: p.v }));
  return <BarChart data={data} unit={series.unit} color={color} />;
}

export default BarChartWidget;
