"use client";

import { apiFetch } from "@repo/network/client";
import type { ReportData, ReportDescriptor } from "@repo/reporting-widgets/ReportWidget";
import type { HomeWidget } from "@repo/reporting-widgets/DashboardHomeWidget";

export interface ContractDomain {
  provider: string;
  app_label: string;
  domain_key: string;
  label: string;
  reports: ReportDescriptor[];
}

export interface Contract {
  domains: ContractDomain[];
}

export async function getContract(): Promise<Contract> {
  const res = await apiFetch("/api/contract");
  if (!res.ok) throw new Error("Impossible de charger le contrat de reporting.");
  return res.json();
}

export async function getReportData(
  provider: string,
  report: string,
  filters?: Record<string, string>,
): Promise<ReportData> {
  const qs = new URLSearchParams({ provider, report, ...(filters ?? {}) });
  const res = await apiFetch(`/api/report-data?${qs.toString()}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail ?? "Impossible de charger les données du rapport.");
  }
  return res.json();
}

export interface HomeResponse {
  widgets: HomeWidget[];
}

export interface DomainDetail {
  provider: string;
  app_label: string;
  domain_key: string;
  label: string;
  reports: ReportDescriptor[];
}

export async function getHome(): Promise<HomeResponse> {
  const res = await apiFetch("/api/home");
  if (!res.ok) throw new Error("Impossible de charger l'accueil du tableau de bord.");
  return res.json();
}

export async function getDomain(provider: string, domain: string): Promise<DomainDetail> {
  const qs = new URLSearchParams({ provider, domain });
  const res = await apiFetch(`/api/domain?${qs.toString()}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail ?? "Impossible de charger le domaine.");
  }
  return res.json();
}

export interface SourceField {
  name: string;
  type: string;
  nullable?: boolean;
  values?: string[];
}

export interface SourceModel {
  name: string;
  fields: SourceField[];
}

export interface DataSourceApp {
  app_key: string;
  app_label: string;
  models: SourceModel[];
}

export interface SourcesResponse {
  sources: DataSourceApp[];
}

export async function getSources(): Promise<SourcesResponse> {
  const res = await apiFetch("/api/sources");
  if (!res.ok) throw new Error("Impossible de charger les sources de données.");
  return res.json();
}

// --- Config multi-sources d'un widget -------------------------------------------------
// Un widget peut porter plusieurs sources (modèles) de LA MÊME app. Chaque source a un id
// local (s1, s2…) servant de clé pour les conditions, l'agrégat, le regroupement et la
// période. Une condition compare une colonne à un littéral OU à la colonne d'une autre
// source (prédicat de jointure).

export interface WidgetSource {
  id: string;
  provider: string;
  model: string;
}

export type ConditionValue =
  | { kind: "literal"; value: string }
  | { kind: "column"; source: string; field: string };

export interface WidgetCondition {
  source: string;
  field: string;
  operator: string;
  value?: ConditionValue;
}

export interface AggregateRef {
  source: string;
  field: string;
}

export interface Widget {
  id: number;
  type: string;
  title: string;
  provider: string;
  model: string;
  config: Record<string, unknown>;
}

export interface WidgetCountData {
  widget_id: number;
  type: "count";
  value: number | null;
  measure?: string;
}

export interface ComparisonSerieValue {
  label: string;
  value: number | null;
}

export interface WidgetComparisonData {
  widget_id: number;
  type: "comparison";
  render: string;
  series: ComparisonSerieValue[];
}

export interface TimeseriesPoint {
  t: string;
  v: number | null;
}

export interface WidgetTimeseriesData {
  widget_id: number;
  type: "timeseries";
  granularity: string;
  measure: string;
  points: TimeseriesPoint[];
}

export interface WidgetGroupbyData {
  widget_id: number;
  type: "groupby";
  render: string;
  series: ComparisonSerieValue[];
}

export interface WidgetTrendData {
  widget_id: number;
  type: "trend";
  measure: string;
  granularity: string;
  value: number | null;
  previous: number | null;
  points: TimeseriesPoint[];
}

export interface GaugeThresholds {
  good: number;
  warn: number;
}

export interface WidgetGaugeData {
  widget_id: number;
  type: "gauge";
  value: number | null;
  target: number | null;
  direction: string;
  thresholds?: GaugeThresholds | null;
}

export interface WidgetTableData {
  widget_id: number;
  type: "table";
  measure: string;
  group_label?: string | null;
  rows: ComparisonSerieValue[];
}

export interface WidgetRatioData {
  widget_id: number;
  type: "ratio";
  numerator: number | null;
  denominator: number | null;
  percent: number | null;
  format: string; // "percent" | "ratio"
}

export interface PivotRow {
  label: string;
  total: number;
  cells: Record<string, number | null>;
}

export interface WidgetPivotData {
  widget_id: number;
  type: "pivot";
  render: string;
  measure: string;
  cols: string[];
  rows: PivotRow[];
}

export type WidgetData =
  | WidgetCountData
  | WidgetComparisonData
  | WidgetTimeseriesData
  | WidgetGroupbyData
  | WidgetTrendData
  | WidgetGaugeData
  | WidgetTableData
  | WidgetRatioData
  | WidgetPivotData;

export interface WidgetInput {
  type?: string;
  title: string;
  provider?: string | null;
  model?: string | null;
  config?: Record<string, unknown>;
}

export async function getWidgets(): Promise<{ widgets: Widget[] }> {
  const res = await apiFetch("/api/widgets");
  if (!res.ok) throw new Error("Impossible de charger les widgets.");
  return res.json();
}

export async function getWidget(id: number): Promise<Widget> {
  const res = await apiFetch(`/api/widgets/${id}`);
  if (!res.ok) throw new Error("Widget introuvable.");
  return res.json();
}

export async function createWidget(input: WidgetInput): Promise<Widget> {
  const res = await apiFetch("/api/widgets", { method: "POST", body: input });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail ?? "Impossible de créer le widget.");
  }
  return res.json();
}

export async function updateWidget(id: number, input: WidgetInput): Promise<Widget> {
  const res = await apiFetch(`/api/widgets/${id}`, { method: "PATCH", body: input });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail ?? "Impossible de modifier le widget.");
  }
  return res.json();
}

export async function deleteWidget(id: number): Promise<void> {
  const res = await apiFetch(`/api/widgets/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error("Impossible de supprimer le widget.");
}

export async function getWidgetData(id: number, from?: string, to?: string): Promise<WidgetData> {
  const qs = new URLSearchParams();
  if (from) qs.set("from", from);
  if (to) qs.set("to", to);
  const suffix = qs.toString() ? `?${qs.toString()}` : "";
  const res = await apiFetch(`/api/widgets/${id}/data${suffix}`);
  if (!res.ok) throw new Error("Impossible de charger la donnée du widget.");
  return res.json();
}

// --- Vue détaillée d'un widget (lignes sous-jacentes) ---------------------------------

// Colonne du tableau détaillé côté config du widget.
export interface WidgetColumnConfig {
  source: string;
  field: string;
  label?: string;
  width?: number | null;
}

// Colonne renvoyée par le backend (résolue).
export interface DetailColumn {
  key: string;
  label: string;
  width?: number | null;
}

export type DetailRow = Record<string, string | number | boolean | null>;

export interface WidgetRowsResponse {
  widget_id: number;
  columns: DetailColumn[];
  rows: DetailRow[];
  total: number;
  page: number;
  page_size: number;
}

export interface WidgetPreviewResponse {
  columns: DetailColumn[];
  rows: DetailRow[];
  total: number;
}

export interface WidgetRowsQuery {
  from?: string;
  to?: string;
  q?: string;
  page?: number;
  page_size?: number;
  drill_field?: string;
  drill_value?: string;
}

function rowsQueryString(opts: WidgetRowsQuery): string {
  const qs = new URLSearchParams();
  if (opts.from) qs.set("from", opts.from);
  if (opts.to) qs.set("to", opts.to);
  if (opts.q) qs.set("q", opts.q);
  if (opts.page) qs.set("page", String(opts.page));
  if (opts.page_size) qs.set("page_size", String(opts.page_size));
  if (opts.drill_field) qs.set("drill_field", opts.drill_field);
  if (opts.drill_value !== undefined && opts.drill_value !== "") qs.set("drill_value", opts.drill_value);
  return qs.toString();
}

export async function getWidgetRows(id: number, opts: WidgetRowsQuery = {}): Promise<WidgetRowsResponse> {
  const qs = rowsQueryString(opts);
  const res = await apiFetch(`/api/widgets/${id}/rows${qs ? `?${qs}` : ""}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail ?? "Impossible de charger les lignes du widget.");
  }
  return res.json();
}

export async function previewRows(input: WidgetInput): Promise<WidgetPreviewResponse> {
  const res = await apiFetch("/api/widgets/preview-rows", { method: "POST", body: input });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail ?? "Aperçu indisponible.");
  }
  return res.json();
}

// URL (même origine) pour télécharger le CSV — utilisée dans un <a download> / window.open.
export function widgetExportUrl(id: number, opts: Omit<WidgetRowsQuery, "page" | "page_size"> = {}): string {
  const qs = rowsQueryString(opts);
  return `/api/widgets/${id}/export${qs ? `?${qs}` : ""}`;
}

// --- Alertes / seuils -----------------------------------------------------------------

export const ALERTABLE_TYPES = ["count", "gauge", "trend", "ratio"];

export interface Alert {
  id: number;
  widget_id: number;
  operator: string;
  threshold: number;
  recipients: string[];
  enabled: boolean;
  last_state: string | null;
  last_value: number | null;
  last_evaluated_at: string | null;
  last_triggered_at: string | null;
}

export interface AlertInput {
  widget_id: number;
  operator: string;
  threshold: number;
  recipients: string[];
  enabled: boolean;
}

export async function getAlerts(widgetId: number): Promise<{ alerts: Alert[] }> {
  const res = await apiFetch(`/api/alerts?widget_id=${widgetId}`);
  if (!res.ok) throw new Error("Impossible de charger les alertes.");
  return res.json();
}

async function alertWrite(url: string, method: string, body?: AlertInput): Promise<Alert> {
  const res = await apiFetch(url, { method, body });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail ?? "Erreur.");
  }
  return res.json();
}

export const createAlert = (input: AlertInput) => alertWrite("/api/alerts", "POST", input);
export const updateAlert = (id: number, input: AlertInput) => alertWrite(`/api/alerts/${id}`, "PATCH", input);

export async function deleteAlert(id: number): Promise<void> {
  const res = await apiFetch(`/api/alerts/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error("Impossible de supprimer l'alerte.");
}

export async function testAlert(id: number): Promise<{ value: number | null; triggered: boolean; fired: boolean }> {
  const res = await apiFetch(`/api/alerts/${id}/test`, { method: "POST" });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail ?? "Test impossible.");
  }
  return res.json();
}
