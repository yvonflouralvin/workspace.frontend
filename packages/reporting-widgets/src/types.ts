// Contrat de données d'un rapport, présentation-agnostique. Servi par l'endpoint
// interne de reporting d'une app (ex. hosto) et rendu par ReportWidget.

export interface ReportKpi {
  label: string;
  value: number | string;
  unit?: string;
}

export interface ReportSeriesPoint {
  t: string;
  v: number;
}

export interface ReportSeries {
  label: string;
  unit?: string;
  points: ReportSeriesPoint[];
}

export interface ReportTableColumn {
  key: string;
  label: string;
}

export interface ReportTable {
  columns: ReportTableColumn[];
  rows: Record<string, unknown>[];
}

export interface ReportData {
  report_key?: string;
  generated_at?: string;
  kpis?: ReportKpi[];
  series?: ReportSeries[];
  table?: ReportTable | null;
}

export interface ReportDescriptor {
  report_key: string;
  label: string;
  description?: string;
  widget?: string;
  provider?: string;
  required_permission?: string;
  refresh_interval_seconds?: number;
}

export interface HomeStat {
  label: string;
  value: number | string;
  unit?: string;
}

// Widget d'accueil du dashboard : résumé compact d'un domaine (1-3 stats),
// cliquable pour entrer dans le domaine (/{provider}/{domain_key}).
export interface HomeWidget {
  provider: string;
  app_label: string;
  domain_key: string;
  label: string;
  description?: string;
  stats: HomeStat[];
  generated_at?: string;
  refresh_interval_seconds?: number;
  href: string;
}
