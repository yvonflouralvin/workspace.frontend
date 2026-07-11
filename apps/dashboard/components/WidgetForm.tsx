"use client";

import { useState, type ReactNode } from "react";
import { AddOutlined, BarChartOutlined, CategoryOutlined, CloseOutlined, LeaderboardOutlined, NumbersOutlined, PercentOutlined, SpeedOutlined, TimelineOutlined, TrendingUpOutlined } from "@mui/icons-material";
import {
  createWidget,
  previewRows,
  updateWidget,
  type Widget,
  type WidgetInput,
  type WidgetPreviewResponse,
  type DataSourceApp,
  type SourceField,
  type SourceModel,
} from "@/lib/dashboard-api";

const TYPE_ICON: Record<string, ReactNode> = {
  count: <NumbersOutlined style={{ fontSize: 20 }} />,
  trend: <TrendingUpOutlined style={{ fontSize: 20 }} />,
  gauge: <SpeedOutlined style={{ fontSize: 20 }} />,
  comparison: <BarChartOutlined style={{ fontSize: 20 }} />,
  timeseries: <TimelineOutlined style={{ fontSize: 20 }} />,
  groupby: <CategoryOutlined style={{ fontSize: 20 }} />,
  table: <LeaderboardOutlined style={{ fontSize: 20 }} />,
  ratio: <PercentOutlined style={{ fontSize: 20 }} />,
};

const inputCls =
  "w-full rounded-xl border border-outline-variant bg-surface-container-lowest px-3 py-2 text-body-md text-on-surface focus:border-primary focus:outline-none";

const OPERATORS = [
  { value: "eq", label: "=" }, { value: "ne", label: "≠" },
  { value: "gt", label: ">" }, { value: "gte", label: "≥" },
  { value: "lt", label: "<" }, { value: "lte", label: "≤" },
  { value: "contains", label: "Contient" },
  { value: "starts_with", label: "Commence par" },
  { value: "ends_with", label: "Finit par" },
  { value: "is_true", label: "Est vrai" }, { value: "is_false", label: "Est faux" },
];
const NO_VALUE = new Set(["is_true", "is_false"]);
// Seuls les opérateurs de comparaison peuvent référencer la colonne d'une autre source
// (prédicat de jointure). Les opérateurs texte (contains…) restent sur un littéral.
const CMP_OPS = new Set(["eq", "ne", "gt", "gte", "lt", "lte"]);

export const WIDGET_TYPES = [
  { value: "count", label: "Comptage", description: "Le nombre — ou une somme/moyenne — d'un ou plusieurs modèles joints, filtrable." },
  { value: "trend", label: "KPI de tendance", description: "Une valeur + son évolution vs la période précédente + sparkline." },
  { value: "gauge", label: "Jauge / Objectif", description: "Une valeur comparée à un objectif, colorée selon l'atteinte." },
  { value: "comparison", label: "Comparaison", description: "Compare plusieurs valeurs (chiffres, histogramme, camembert)." },
  { value: "timeseries", label: "Série temporelle", description: "L'évolution d'une valeur dans le temps, en courbe." },
  { value: "groupby", label: "Regroupement", description: "Répartition automatique d'une valeur par catégorie." },
  { value: "table", label: "Tableau / palmarès", description: "Un classement top‑N par catégorie, du plus grand au plus petit." },
  { value: "ratio", label: "Ratio / Pourcentage", description: "Une valeur en pourcentage d'une autre (ex. taux de paiement)." },
];

const CATEGORICAL = new Set(["enum", "string", "boolean", "integer"]);
const categoricalFields = (fields: SourceField[]) => fields.filter((f) => CATEGORICAL.has(f.type));

const GRANULARITIES = [
  { value: "day", label: "Jour" },
  { value: "week", label: "Semaine" },
  { value: "month", label: "Mois" },
];

const MEASURES = [
  { value: "count", label: "Nombre de lignes" },
  { value: "sum", label: "Somme" },
  { value: "avg", label: "Moyenne" },
  { value: "min", label: "Minimum" },
  { value: "max", label: "Maximum" },
];
const NEEDS_FIELD = new Set(["sum", "avg", "min", "max"]);
const numericFields = (fields: SourceField[]) => fields.filter((f) => f.type === "integer" || f.type === "decimal");

const ORDER_OPTIONS = [
  { value: "value_desc", label: "Valeur ↓" },
  { value: "value_asc", label: "Valeur ↑" },
  { value: "label_asc", label: "Libellé A→Z" },
  { value: "label_desc", label: "Libellé Z→A" },
];

const RENDER_OPTIONS = [
  { value: "numbers_row", label: "Chiffres (ligne)" },
  { value: "numbers_column", label: "Chiffres (colonne)" },
  { value: "bar_vertical", label: "Histogramme (vertical)" },
  { value: "bar_horizontal", label: "Histogramme (horizontal)" },
  { value: "pie", label: "Camembert" },
];

// --- État interne (UI) d'une « spec » : un ou plusieurs modèles de la même app --------
type UICondition = {
  source: string;
  field: string;
  operator: string;
  valueKind: "literal" | "column";
  literal: string;
  colSource: string;
  colField: string;
};

type SpecSource = { id: string; model: string };

type SpecState = {
  provider: string;
  sources: SpecSource[];
  measure: string;
  aggSource: string;
  aggField: string;
  conditions: UICondition[];
  periodSource: string;
};

// Lecture d'une config existante (legacy mono-source OU nouvelle multi-sources).
type RawCond = { source?: string; field?: string; operator?: string; value?: unknown };
type RawSource = { id?: string; provider?: string; model?: string };
type RawSpec = {
  sources?: RawSource[];
  provider?: string;
  model?: string;
  measure?: string;
  field?: string;
  aggregate?: { source?: string; field?: string };
  conditions?: RawCond[];
  period?: { source?: string };
  label?: string;
};

function genSourceId(existing: SpecSource[]): string {
  let i = 1;
  const ids = new Set(existing.map((s) => s.id));
  while (ids.has(`s${i}`)) i += 1;
  return `s${i}`;
}

function toUICondition(c: RawCond, primary: string): UICondition {
  const source = c.source || primary;
  const v = c.value;
  if (v && typeof v === "object" && (v as { kind?: string }).kind === "column") {
    const cv = v as { source?: string; field?: string };
    return { source, field: c.field ?? "", operator: c.operator ?? "eq", valueKind: "column", literal: "", colSource: cv.source ?? "", colField: cv.field ?? "" };
  }
  const literal = v && typeof v === "object" ? String((v as { value?: unknown }).value ?? "") : v == null ? "" : String(v);
  return { source, field: c.field ?? "", operator: c.operator ?? "eq", valueKind: "literal", literal, colSource: "", colField: "" };
}

function specFromRaw(raw: RawSpec | undefined, fp?: string, fm?: string): SpecState {
  const r = raw ?? {};
  let provider = fp ?? "";
  let sources: SpecSource[];
  if (Array.isArray(r.sources) && r.sources.length) {
    provider = r.sources[0]?.provider ?? fp ?? "";
    sources = r.sources.map((s, i) => ({ id: s.id || `s${i + 1}`, model: s.model ?? "" }));
  } else {
    provider = r.provider ?? fp ?? "";
    sources = [{ id: "s1", model: r.model ?? fm ?? "" }];
  }
  const primary = sources[0]?.id ?? "s1";
  const measure = r.measure ?? "count";
  const agg = r.aggregate ?? (r.field ? { source: primary, field: r.field } : undefined);
  const conditions = (r.conditions ?? []).map((c) => toUICondition(c, primary));
  return {
    provider,
    sources,
    measure,
    aggSource: agg?.source ?? primary,
    aggField: agg?.field ?? "",
    conditions,
    periodSource: r.period?.source ?? primary,
  };
}

function emptySpec(): SpecState {
  return { provider: "", sources: [{ id: "s1", model: "" }], measure: "count", aggSource: "s1", aggField: "", conditions: [], periodSource: "s1" };
}

const modelsOf = (catalog: DataSourceApp[], provider: string): SourceModel[] => catalog.find((s) => s.app_key === provider)?.models ?? [];
const fieldsOf = (catalog: DataSourceApp[], provider: string, model: string): SourceField[] => modelsOf(catalog, provider).find((m) => m.name === model)?.fields ?? [];
const filledSources = (spec: SpecState) => spec.sources.filter((s) => s.model);
const createdAtSources = (catalog: DataSourceApp[], spec: SpecState) =>
  filledSources(spec).filter((s) => fieldsOf(catalog, spec.provider, s.model).some((f) => f.name === "created_at"));

function packSpec(spec: SpecState, includePeriod: boolean) {
  const sources = filledSources(spec).map((s) => ({ id: s.id, provider: spec.provider, model: s.model }));
  const conditions = spec.conditions
    .filter((c) => c.source && c.field && c.operator)
    .map((c) => {
      const base = { source: c.source, field: c.field, operator: c.operator };
      if (NO_VALUE.has(c.operator)) return base;
      if (c.valueKind === "column" && CMP_OPS.has(c.operator)) {
        return { ...base, value: { kind: "column", source: c.colSource, field: c.colField } };
      }
      return { ...base, value: { kind: "literal", value: c.literal } };
    });
  const aggregate = NEEDS_FIELD.has(spec.measure) ? { source: spec.aggSource, field: spec.aggField } : undefined;
  const out: Record<string, unknown> = { sources, conditions, measure: spec.measure };
  if (aggregate) out.aggregate = aggregate;
  if (includePeriod && spec.periodSource) out.period = { source: spec.periodSource };
  return out;
}

function specError(spec: SpecState): string | null {
  if (!spec.provider) return "Choisissez une application.";
  if (filledSources(spec).length === 0) return "Ajoutez au moins un modèle.";
  if (NEEDS_FIELD.has(spec.measure) && (!spec.aggSource || !spec.aggField)) return "Choisissez le modèle et le champ à agréger.";
  for (const c of spec.conditions) {
    if (c.source && c.field && c.valueKind === "column" && CMP_OPS.has(c.operator) && (!c.colSource || !c.colField)) {
      return "Complétez la colonne référencée dans une condition.";
    }
  }
  return null;
}

// ---------------------------------------------------------------------------------------

function MeasureFields({ catalog, spec, onChange }: { catalog: DataSourceApp[]; spec: SpecState; onChange: (patch: Partial<SpecState>) => void }) {
  const filled = filledSources(spec);
  const aggFields = numericFields(fieldsOf(catalog, spec.provider, filled.find((s) => s.id === spec.aggSource)?.model ?? ""));
  return (
    <div className="grid gap-2 sm:grid-cols-3">
      <div className="flex flex-col gap-1">
        <label className="text-label-md font-medium text-on-surface-variant">Mesure</label>
        <select className={inputCls} value={spec.measure}
          onChange={(e) => onChange(NEEDS_FIELD.has(e.target.value) ? { measure: e.target.value } : { measure: e.target.value, aggField: "" })}>
          {MEASURES.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
        </select>
      </div>
      {NEEDS_FIELD.has(spec.measure) && (
        <>
          {filled.length > 1 && (
            <div className="flex flex-col gap-1">
              <label className="text-label-md font-medium text-on-surface-variant">Modèle à agréger</label>
              <select className={inputCls} value={spec.aggSource} onChange={(e) => onChange({ aggSource: e.target.value, aggField: "" })}>
                {filled.map((s) => <option key={s.id} value={s.id}>{s.model}</option>)}
              </select>
            </div>
          )}
          <div className="flex flex-col gap-1">
            <label className="text-label-md font-medium text-on-surface-variant">Champ (numérique)</label>
            <select className={inputCls} value={spec.aggField} onChange={(e) => onChange({ aggField: e.target.value })}>
              <option value="">Choisir un champ…</option>
              {aggFields.map((f) => <option key={f.name} value={f.name}>{f.name}</option>)}
            </select>
          </div>
        </>
      )}
    </div>
  );
}

function ConditionsEditor({ catalog, spec, onChange }: { catalog: DataSourceApp[]; spec: SpecState; onChange: (c: UICondition[]) => void }) {
  const filled = filledSources(spec);
  const fieldsForSource = (sid: string) => fieldsOf(catalog, spec.provider, filled.find((s) => s.id === sid)?.model ?? "");
  const update = (i: number, patch: Partial<UICondition>) => onChange(spec.conditions.map((c, idx) => (idx === i ? { ...c, ...patch } : c)));
  const add = () => {
    const sid = filled[0]?.id ?? "s1";
    onChange([...spec.conditions, { source: sid, field: fieldsForSource(sid)[0]?.name ?? "", operator: "eq", valueKind: "literal", literal: "", colSource: "", colField: "" }]);
  };
  const sourceLabel = (s: SpecSource) => (filled.length > 1 ? `${s.id} · ${s.model}` : s.model);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-label-md font-medium text-on-surface-variant">Conditions</span>
        <button type="button" onClick={add} className="inline-flex items-center gap-1 text-label-md text-primary hover:opacity-70">
          <AddOutlined style={{ fontSize: 16 }} /> Ajouter
        </button>
      </div>
      {spec.conditions.length === 0 && <p className="text-label-md text-on-surface-variant/60">Aucune condition — compte toutes les lignes.</p>}
      {spec.conditions.map((cond, i) => {
        const fdef = fieldsForSource(cond.source).find((f) => f.name === cond.field);
        const isEnum = !!fdef?.values?.length && (cond.operator === "eq" || cond.operator === "ne");
        const canColumn = CMP_OPS.has(cond.operator);
        const asColumn = cond.valueKind === "column" && canColumn;
        return (
          <div key={i} className="relative space-y-2 rounded-xl border border-outline-variant p-3 pr-9">
            <button type="button" onClick={() => onChange(spec.conditions.filter((_, idx) => idx !== i))}
              className="absolute right-2 top-2 rounded p-1 text-on-surface-variant/50 hover:text-error"><CloseOutlined style={{ fontSize: 16 }} /></button>
            <div className="grid grid-cols-2 gap-2">
              {filled.length > 1 && (
                <select className={inputCls} value={cond.source} onChange={(e) => update(i, { source: e.target.value, field: fieldsForSource(e.target.value)[0]?.name ?? "" })}>
                  {filled.map((s) => <option key={s.id} value={s.id}>{sourceLabel(s)}</option>)}
                </select>
              )}
              <select className={`${inputCls} ${filled.length > 1 ? "" : "col-span-2"}`} value={cond.field} onChange={(e) => update(i, { field: e.target.value })}>
                {fieldsForSource(cond.source).map((f) => <option key={f.name} value={f.name}>{f.name}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-[auto_1fr] items-center gap-2">
              <select className={inputCls} value={cond.operator} onChange={(e) => update(i, { operator: e.target.value })}>
                {OPERATORS.map((op) => <option key={op.value} value={op.value}>{op.label}</option>)}
              </select>
              {NO_VALUE.has(cond.operator) ? (
                <span className="text-body-sm text-on-surface-variant/60">(sans valeur)</span>
              ) : (
                <div className="space-y-1">
                  {canColumn && (
                    <div className="inline-flex overflow-hidden rounded-lg border border-outline-variant text-label-sm">
                      <button type="button" onClick={() => update(i, { valueKind: "literal" })}
                        className={`px-2 py-1 ${!asColumn ? "bg-primary text-on-primary" : "text-on-surface-variant"}`}>Valeur</button>
                      <button type="button" onClick={() => update(i, { valueKind: "column" })}
                        className={`px-2 py-1 ${asColumn ? "bg-primary text-on-primary" : "text-on-surface-variant"}`}>Colonne</button>
                    </div>
                  )}
                  {asColumn ? (
                    <select className={inputCls} value={cond.colSource && cond.colField ? `${cond.colSource}::${cond.colField}` : ""}
                      onChange={(e) => { const [cs, cf] = e.target.value.split("::"); update(i, { colSource: cs ?? "", colField: cf ?? "" }); }}>
                      <option value="">Colonne…</option>
                      {filled.map((s) => (
                        <optgroup key={s.id} label={sourceLabel(s)}>
                          {fieldsOf(catalog, spec.provider, s.model).map((f) => <option key={`${s.id}::${f.name}`} value={`${s.id}::${f.name}`}>{f.name}</option>)}
                        </optgroup>
                      ))}
                    </select>
                  ) : isEnum ? (
                    <select className={inputCls} value={cond.literal} onChange={(e) => update(i, { literal: e.target.value })}>
                      <option value="">Valeur…</option>
                      {fdef!.values!.map((v) => <option key={v} value={v}>{v}</option>)}
                    </select>
                  ) : (
                    <input className={inputCls} value={cond.literal} onChange={(e) => update(i, { literal: e.target.value })} placeholder="Valeur" />
                  )}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function SpecEditor({ catalog, spec, onChange, periodRequired = false, periodLabel = "Filtre de période appliqué à", lockProvider = false }: {
  catalog: DataSourceApp[];
  spec: SpecState;
  onChange: (patch: Partial<SpecState>) => void;
  periodRequired?: boolean;
  periodLabel?: string;
  lockProvider?: boolean;
}) {
  const filled = filledSources(spec);
  const ctSources = createdAtSources(catalog, spec);
  const showPeriod = ctSources.length > 0 && (periodRequired || filled.length > 1);

  const setProvider = (provider: string) => onChange({
    provider, sources: [{ id: "s1", model: "" }], measure: "count", aggSource: "s1", aggField: "", conditions: [], periodSource: "s1",
  });
  const setModel = (id: string, model: string) => {
    const sources = spec.sources.map((s) => (s.id === id ? { ...s, model } : s));
    onChange({ sources, conditions: spec.conditions.filter((c) => c.source !== id) });
  };
  const addSource = () => {
    const id = genSourceId(spec.sources);
    onChange({ sources: [...spec.sources, { id, model: "" }] });
  };
  const removeSource = (id: string) => {
    const sources = spec.sources.filter((s) => s.id !== id);
    const primary = sources[0]?.id ?? "s1";
    onChange({
      sources,
      conditions: spec.conditions.filter((c) => c.source !== id && !(c.valueKind === "column" && c.colSource === id)),
      aggSource: spec.aggSource === id ? primary : spec.aggSource,
      periodSource: spec.periodSource === id ? primary : spec.periodSource,
    });
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-1">
        <label className="text-label-md font-medium text-on-surface-variant">Application (source de données)</label>
        <select className={inputCls} value={spec.provider} disabled={lockProvider} onChange={(e) => setProvider(e.target.value)}>
          <option value="">Choisir une application…</option>
          {catalog.map((s) => <option key={s.app_key} value={s.app_key}>{s.app_label}</option>)}
        </select>
      </div>

      {spec.provider && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-label-md font-medium text-on-surface-variant">Modèles</label>
            <button type="button" onClick={addSource} className="inline-flex items-center gap-1 text-label-md text-primary hover:opacity-70">
              <AddOutlined style={{ fontSize: 16 }} /> Ajouter un modèle
            </button>
          </div>
          {spec.sources.length > 1 && (
            <p className="text-label-sm text-on-surface-variant/60">Plusieurs modèles de la même application, joints par les conditions (comparer une colonne à celle d&apos;un autre modèle).</p>
          )}
          {spec.sources.map((s) => (
            <div key={s.id} className="flex items-center gap-2">
              {spec.sources.length > 1 && <span className="w-8 shrink-0 text-label-sm text-on-surface-variant/60">{s.id}</span>}
              <select className={inputCls} value={s.model} onChange={(e) => setModel(s.id, e.target.value)}>
                <option value="">Choisir un modèle…</option>
                {modelsOf(catalog, spec.provider).map((m) => <option key={m.name} value={m.name}>{m.name}</option>)}
              </select>
              {spec.sources.length > 1 && (
                <button type="button" onClick={() => removeSource(s.id)}
                  className="rounded p-1 text-on-surface-variant/50 hover:text-error"><CloseOutlined style={{ fontSize: 16 }} /></button>
              )}
            </div>
          ))}
        </div>
      )}

      {filled.length > 0 && (
        <>
          <MeasureFields catalog={catalog} spec={spec} onChange={onChange} />
          <ConditionsEditor catalog={catalog} spec={spec} onChange={(c) => onChange({ conditions: c })} />
          {showPeriod && (
            <div className="flex flex-col gap-1">
              <label className="text-label-md font-medium text-on-surface-variant">{periodLabel}</label>
              <select className={inputCls} value={spec.periodSource} onChange={(e) => onChange({ periodSource: e.target.value })}>
                {ctSources.map((s) => <option key={s.id} value={s.id}>{filled.length > 1 ? `${s.id} · ${s.model}` : s.model}</option>)}
              </select>
              <p className="text-label-sm text-on-surface-variant/60">Le filtre Du/Au (et l&apos;axe temporel) s&apos;applique au <code>created_at</code> de ce modèle.</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// --- Config du tableau de la vue détaillée ---------------------------------------------
type DetailCol = { source: string; field: string; label: string; width: string };

const cellStr = (v: unknown) => (v === null || v === undefined ? "—" : typeof v === "boolean" ? (v ? "oui" : "non") : String(v));

function DetailColumnsSection({ catalog, spec, cols, onCols, searchAll, onSearchAll, searchSel, onSearchSel, onPreview, preview, previewErr, previewing }: {
  catalog: DataSourceApp[];
  spec: SpecState;
  cols: DetailCol[];
  onCols: (c: DetailCol[]) => void;
  searchAll: boolean;
  onSearchAll: (v: boolean) => void;
  searchSel: Set<string>;
  onSearchSel: (s: Set<string>) => void;
  onPreview: () => void;
  preview: WidgetPreviewResponse | null;
  previewErr: string | null;
  previewing: boolean;
}) {
  const filled = filledSources(spec);
  const fieldsForSource = (sid: string) => fieldsOf(catalog, spec.provider, filled.find((s) => s.id === sid)?.model ?? "");
  const srcLabel = (sid: string) => (filled.length > 1 ? `${sid} · ${filled.find((s) => s.id === sid)?.model}` : filled.find((s) => s.id === sid)?.model ?? "");
  const update = (i: number, patch: Partial<DetailCol>) => onCols(cols.map((c, idx) => (idx === i ? { ...c, ...patch } : c)));
  const add = () => { const sid = filled[0]?.id ?? "s1"; onCols([...cols, { source: sid, field: fieldsForSource(sid)[0]?.name ?? "", label: "", width: "" }]); };
  const toggleSearch = (key: string) => { const n = new Set(searchSel); if (n.has(key)) n.delete(key); else n.add(key); onSearchSel(n); };

  return (
    <div className="space-y-3 rounded-xl border border-outline-variant p-4">
      <div>
        <p className="text-label-md font-medium text-on-surface-variant">Vue détaillée — colonnes du tableau</p>
        <p className="text-label-sm text-on-surface-variant/60">Colonnes affichées dans la page « Voir plus » (lignes qui génèrent la valeur). Vide = toutes les colonnes des modèles.</p>
      </div>

      <div className="space-y-2">
        {cols.map((c, i) => (
          <div key={i} className="flex flex-wrap items-center gap-2">
            {filled.length > 1 && (
              <select className={`${inputCls} w-auto flex-1`} value={c.source} onChange={(e) => update(i, { source: e.target.value, field: fieldsForSource(e.target.value)[0]?.name ?? "" })}>
                {filled.map((s) => <option key={s.id} value={s.id}>{srcLabel(s.id)}</option>)}
              </select>
            )}
            <select className={`${inputCls} w-auto flex-1`} value={c.field} onChange={(e) => update(i, { field: e.target.value })}>
              {fieldsForSource(c.source).map((f) => <option key={f.name} value={f.name}>{f.name}</option>)}
            </select>
            <input className={`${inputCls} w-auto flex-1`} value={c.label} onChange={(e) => update(i, { label: e.target.value })} placeholder="Libellé (optionnel)" />
            <input type="number" min={1} max={100} className={`${inputCls} w-20`} value={c.width} onChange={(e) => update(i, { width: e.target.value })} placeholder="% larg." />
            <button type="button" onClick={() => onCols(cols.filter((_, idx) => idx !== i))}
              className="rounded p-1 text-on-surface-variant/50 hover:text-error"><CloseOutlined style={{ fontSize: 16 }} /></button>
          </div>
        ))}
        <button type="button" onClick={add} className="inline-flex items-center gap-1 text-label-md text-primary hover:opacity-70">
          <AddOutlined style={{ fontSize: 16 }} /> Ajouter une colonne
        </button>
      </div>

      <div className="space-y-2 border-t border-outline-variant pt-3">
        <label className="flex items-center gap-2 text-label-md text-on-surface-variant">
          <input type="checkbox" checked={searchAll} onChange={(e) => onSearchAll(e.target.checked)} />
          Rechercher sur toutes les colonnes des modèles
        </label>
        {!searchAll && (
          <div className="flex flex-wrap gap-x-4 gap-y-1">
            {filled.flatMap((s) => fieldsOf(catalog, spec.provider, s.model).map((f) => {
              const key = `${s.id}::${f.name}`;
              return (
                <label key={key} className="flex items-center gap-1.5 text-label-sm text-on-surface-variant">
                  <input type="checkbox" checked={searchSel.has(key)} onChange={() => toggleSearch(key)} />
                  {filled.length > 1 ? `${s.id}.${f.name}` : f.name}
                </label>
              );
            }))}
          </div>
        )}
      </div>

      <div className="border-t border-outline-variant pt-3">
        <button type="button" onClick={onPreview} disabled={previewing}
          className="rounded-lg border border-outline-variant px-3 py-1.5 text-label-md text-on-surface-variant transition-colors hover:bg-surface-container disabled:opacity-50">
          {previewing ? "Aperçu…" : "Aperçu (3 lignes)"}
        </button>
        {previewErr && <p className="mt-2 text-label-md text-error">{previewErr}</p>}
        {preview && (
          <div className="mt-2 overflow-x-auto rounded-lg border border-outline-variant">
            <table className="w-full text-label-md">
              <thead>
                <tr className="border-b border-outline-variant text-left text-on-surface-variant">
                  {preview.columns.map((c) => <th key={c.key} className="px-2 py-1 font-medium">{c.label}</th>)}
                </tr>
              </thead>
              <tbody>
                {preview.rows.length === 0 ? (
                  <tr><td className="px-2 py-1 text-on-surface-variant/60" colSpan={Math.max(1, preview.columns.length)}>Aucune ligne.</td></tr>
                ) : preview.rows.map((r, i) => (
                  <tr key={i} className="border-b border-outline-variant/50 last:border-0">
                    {preview.columns.map((c) => <td key={c.key} className="px-2 py-1 text-on-surface">{cellStr(r[c.key])}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------------------

export function WidgetForm({ sources, widget, initialType, onSaved, onCancel }: { sources: DataSourceApp[]; widget?: Widget; initialType?: string; onSaved: (w: Widget) => void; onCancel: () => void }) {
  const isEdit = !!widget;
  const cfg = (widget?.config ?? {}) as RawSpec & {
    render?: string; target?: number; direction?: string; thresholds?: { good?: number; warn?: number };
    limit?: number; format?: string; granularity?: string; buckets?: number;
    group?: { source?: string; field?: string }; group_by?: string;
    reference?: { model?: string; join_field?: string; label_field?: string };
    series?: (RawSpec & { label?: string })[]; numerator?: RawSpec; denominator?: RawSpec;
    columns?: { source?: string; field?: string; label?: string; width?: number }[];
    search_fields?: { source?: string; field?: string }[];
    order?: string; others?: boolean;
    having?: { operator?: string; value?: number };
  };

  const [type, setType] = useState<string>(widget?.type ?? initialType ?? "count");
  const [title, setTitle] = useState(widget?.title ?? "");

  // Widget mono (count/timeseries/trend/gauge/groupby/table) — une spec multi-sources.
  const [spec, setSpec] = useState<SpecState>(() => specFromRaw(cfg, widget?.provider, widget?.model));
  const patchSpec = (p: Partial<SpecState>) => setSpec((s) => ({ ...s, ...p }));

  // Extras par type.
  const [target, setTarget] = useState<string>(cfg.target !== undefined ? String(cfg.target) : "");
  const [direction, setDirection] = useState<string>(cfg.direction ?? "higher");
  const thCfg = cfg.thresholds ?? {};
  const [goodPct, setGoodPct] = useState<string>(thCfg.good !== undefined ? String(thCfg.good) : "");
  const [warnPct, setWarnPct] = useState<string>(thCfg.warn !== undefined ? String(thCfg.warn) : "");
  const [limit, setLimit] = useState<number>(cfg.limit ?? 10);
  const [granularity, setGranularity] = useState<string>(cfg.granularity ?? "month");
  const [buckets, setBuckets] = useState<number>(cfg.buckets ?? 12);
  const initGroup = cfg.group ?? (cfg.group_by ? { source: spec.sources[0]?.id, field: cfg.group_by } : {});
  const [groupSource, setGroupSource] = useState<string>(initGroup.source ?? spec.sources[0]?.id ?? "s1");
  const [groupField, setGroupField] = useState<string>(initGroup.field ?? "");
  const refCfg = cfg.reference ?? {};
  const [refModel, setRefModel] = useState<string>(refCfg.model ?? "");
  const [refJoin, setRefJoin] = useState<string>(refCfg.join_field ?? "");
  const [refLabel, setRefLabel] = useState<string>(refCfg.label_field ?? "");
  const [render, setRender] = useState<string>(cfg.render ?? "bar_vertical");
  const [order, setOrder] = useState<string>(cfg.order ?? "value_desc");
  const [others, setOthers] = useState<boolean>(!!cfg.others);
  const [havingOp, setHavingOp] = useState<string>(cfg.having?.operator ?? "");
  const [havingVal, setHavingVal] = useState<string>(cfg.having?.value != null ? String(cfg.having.value) : "");

  // Vue détaillée — colonnes du tableau + colonnes cherchables + aperçu.
  const [detailCols, setDetailCols] = useState<DetailCol[]>(
    Array.isArray(cfg.columns) ? cfg.columns.map((c) => ({ source: c.source ?? "", field: c.field ?? "", label: c.label ?? "", width: c.width != null ? String(c.width) : "" })) : [],
  );
  const initSearch = Array.isArray(cfg.search_fields) ? cfg.search_fields.map((c) => `${c.source}::${c.field}`) : [];
  const [searchAll, setSearchAll] = useState<boolean>(initSearch.length === 0);
  const [searchSel, setSearchSel] = useState<Set<string>>(new Set(initSearch));
  const [preview, setPreview] = useState<WidgetPreviewResponse | null>(null);
  const [previewErr, setPreviewErr] = useState<string | null>(null);
  const [previewing, setPreviewing] = useState(false);

  // Comparison / ratio — plusieurs specs indépendants.
  type LabelledSpec = { label: string; spec: SpecState };
  const [series, setSeries] = useState<LabelledSpec[]>(
    Array.isArray(cfg.series) ? cfg.series.map((s) => ({ label: s.label ?? "", spec: specFromRaw(s) })) : [],
  );
  const [numerator, setNumerator] = useState<SpecState>(() => (cfg.numerator ? specFromRaw(cfg.numerator) : emptySpec()));
  const [denominator, setDenominator] = useState<SpecState>(() => (cfg.denominator ? specFromRaw(cfg.denominator) : emptySpec()));
  const [ratioFormat, setRatioFormat] = useState<string>(cfg.format ?? "percent");

  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const typeMeta = WIDGET_TYPES.find((t) => t.value === type) ?? { label: "Widget", description: "" };
  const filled = filledSources(spec);
  const groupFields = categoricalFields(fieldsOf(sources, spec.provider, filled.find((s) => s.id === groupSource)?.model ?? filled[0]?.model ?? ""));
  const measureIsAdditive = spec.measure === "count" || spec.measure === "sum";

  const detailConfig = (): Record<string, unknown> => {
    const columns = detailCols
      .filter((c) => c.source && c.field)
      .map((c) => ({ source: c.source, field: c.field, label: c.label.trim() || undefined, width: c.width ? Math.max(1, Math.min(Number(c.width), 100)) : undefined }));
    const out: Record<string, unknown> = {};
    if (columns.length) out.columns = columns;
    if (!searchAll && searchSel.size) out.search_fields = Array.from(searchSel).map((k) => { const [source, field] = k.split("::"); return { source, field }; });
    return out;
  };

  async function doPreview() {
    setPreviewErr(null);
    setPreviewing(true);
    try {
      const previewInput: WidgetInput = {
        type, title: title.trim() || "preview",
        provider: spec.provider, model: filled[0]?.model ?? null,
        config: { ...packSpec(spec, true), ...detailConfig() },
      };
      setPreview(await previewRows(previewInput));
    } catch (e) {
      setPreview(null);
      setPreviewErr(e instanceof Error ? e.message : "Aperçu indisponible.");
    } finally {
      setPreviewing(false);
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    let input: { type: string; title: string; provider?: string | null; model?: string | null; config: Record<string, unknown> };

    if (type === "comparison") {
      if (!title.trim() || series.length === 0) { setErr("Titre et au moins une source requis."); return; }
      for (const s of series) { const se = specError(s.spec); if (se) { setErr(se); return; } }
      input = {
        type: "comparison", title: title.trim(),
        config: { render, series: series.map((s) => ({ label: s.label.trim() || filledSources(s.spec)[0]?.model || "?", ...packSpec(s.spec, true) })) },
      };
    } else if (type === "ratio") {
      if (!title.trim()) { setErr("Titre requis."); return; }
      for (const [name, s] of [["numérateur", numerator], ["dénominateur", denominator]] as const) {
        const se = specError(s); if (se) { setErr(`${name} : ${se}`); return; }
      }
      input = { type: "ratio", title: title.trim(), config: { numerator: packSpec(numerator, true), denominator: packSpec(denominator, true), format: ratioFormat } };
    } else {
      if (!title.trim()) { setErr("Titre requis."); return; }
      const se = specError(spec); if (se) { setErr(se); return; }
      if ((type === "groupby" || type === "table") && !groupField) { setErr("Choisissez la colonne de regroupement."); return; }
      if (type === "gauge" && !Number.isFinite(Number(target))) { setErr("Renseignez un objectif (cible) numérique."); return; }
      if ((type === "timeseries" || type === "trend") && !createdAtSources(sources, spec).some((s) => s.id === spec.periodSource)) {
        setErr("Choisissez un modèle avec created_at pour l'axe temporel."); return;
      }
      const base = { ...packSpec(spec, true), ...detailConfig() };
      const primaryModel = filled[0]?.model ?? null;
      const reference = refModel && refJoin && refLabel ? { model: refModel, join_field: refJoin, label_field: refLabel } : undefined;
      const thDefaults = direction === "lower" ? { good: 100, warn: 140 } : { good: 100, warn: 60 };
      const thresholds = goodPct !== "" || warnPct !== ""
        ? { good: goodPct !== "" ? Number(goodPct) : thDefaults.good, warn: warnPct !== "" ? Number(warnPct) : thDefaults.warn }
        : undefined;
      const group = { source: groupSource, field: groupField };
      const having = havingOp && havingVal !== "" ? { operator: havingOp, value: Number(havingVal) } : undefined;
      const common = { type, title: title.trim(), provider: spec.provider, model: primaryModel };
      input =
        type === "timeseries" || type === "trend"
          ? { ...common, config: { ...base, granularity, buckets: Math.max(2, Math.min(Number(buckets) || 12, 366)) } }
          : type === "groupby"
            ? { ...common, config: { ...base, group, render, reference, order, others: others && measureIsAdditive, having, limit: Math.max(1, Math.min(Number(limit) || 10, 200)) } }
            : type === "table"
              ? { ...common, config: { ...base, group, limit: Math.max(1, Math.min(Number(limit) || 10, 200)), reference, order, others: others && measureIsAdditive, having } }
              : type === "gauge"
                ? { ...common, config: { ...base, target: Number(target), direction, thresholds } }
                : { ...common, config: base };
    }

    setSaving(true);
    try {
      const w = isEdit ? await updateWidget(widget!.id, input) : await createWidget(input);
      onSaved(w);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Erreur.");
    } finally {
      setSaving(false);
    }
  }

  const updateSerie = (i: number, patch: Partial<LabelledSpec>) => setSeries((prev) => prev.map((s, idx) => (idx === i ? { ...s, ...patch } : s)));

  return (
    <form onSubmit={submit} className="space-y-5">
      <div className="flex items-start gap-3 rounded-xl border border-outline-variant bg-surface-container-low/50 p-4">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
          {TYPE_ICON[type] ?? TYPE_ICON.count}
        </span>
        <div className="min-w-0">
          <p className="font-display text-body-lg font-semibold text-on-surface">{typeMeta.label}</p>
          <p className="text-body-sm text-on-surface-variant">{typeMeta.description}</p>
        </div>
      </div>

      {!isEdit && (
        <div className="flex flex-col gap-1">
          <label className="text-label-md font-medium text-on-surface-variant">Type de widget</label>
          <select className={inputCls} value={type} onChange={(e) => setType(e.target.value)}>
            {WIDGET_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </div>
      )}

      <div className="flex flex-col gap-1">
        <label className="text-label-md font-medium text-on-surface-variant">Titre</label>
        <input className={inputCls} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex. Patients par sexe" />
      </div>

      {type === "ratio" ? (
        <>
          <div className="space-y-2 rounded-xl border border-outline-variant p-4">
            <p className="text-label-md font-medium text-on-surface-variant">Numérateur (la part)</p>
            <SpecEditor catalog={sources} spec={numerator} onChange={(p) => setNumerator((s) => ({ ...s, ...p }))} />
          </div>
          <div className="space-y-2 rounded-xl border border-outline-variant p-4">
            <p className="text-label-md font-medium text-on-surface-variant">Dénominateur (le total)</p>
            <SpecEditor catalog={sources} spec={denominator} onChange={(p) => setDenominator((s) => ({ ...s, ...p }))} />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-label-md font-medium text-on-surface-variant">Format</label>
            <select className={inputCls} value={ratioFormat} onChange={(e) => setRatioFormat(e.target.value)}>
              <option value="percent">Pourcentage (%)</option>
              <option value="ratio">Ratio (×)</option>
            </select>
          </div>
        </>
      ) : type === "comparison" ? (
        <>
          <div className="flex flex-col gap-1">
            <label className="text-label-md font-medium text-on-surface-variant">Rendu</label>
            <select className={inputCls} value={render} onChange={(e) => setRender(e.target.value)}>
              {RENDER_OPTIONS.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
            </select>
          </div>
          <div className="flex items-center justify-between">
            <label className="text-label-md font-medium text-on-surface-variant">Sources à comparer</label>
            <button type="button" onClick={() => setSeries((prev) => [...prev, { label: "", spec: emptySpec() }])}
              className="inline-flex items-center gap-1 text-label-md text-primary hover:opacity-70">
              <AddOutlined style={{ fontSize: 16 }} /> Ajouter une source
            </button>
          </div>
          {series.length === 0 && <p className="text-label-md text-on-surface-variant/60">Ajoutez au moins une source (ex. patients hommes, patients femmes).</p>}
          {series.map((s, i) => (
            <div key={i} className="relative space-y-2 rounded-xl border border-outline-variant p-4 pr-9">
              <button type="button" onClick={() => setSeries((prev) => prev.filter((_, idx) => idx !== i))}
                className="absolute right-2 top-2 rounded p-1 text-on-surface-variant/50 hover:text-error"><CloseOutlined style={{ fontSize: 16 }} /></button>
              <input className={inputCls} value={s.label} onChange={(e) => updateSerie(i, { label: e.target.value })} placeholder="Libellé (ex. Hommes)" />
              <SpecEditor catalog={sources} spec={s.spec} onChange={(p) => updateSerie(i, { spec: { ...s.spec, ...p } })} />
            </div>
          ))}
        </>
      ) : (
        <>
          <SpecEditor
            catalog={sources}
            spec={spec}
            onChange={patchSpec}
            periodRequired={type === "timeseries" || type === "trend"}
            periodLabel={type === "timeseries" || type === "trend" ? "Axe temporel (created_at de)" : "Filtre de période appliqué à"}
          />

          {filled.length > 0 && (type === "groupby" || type === "table") && (
            <div className="space-y-3">
              <div className="grid gap-4 sm:grid-cols-2">
                {filled.length > 1 && (
                  <div className="flex flex-col gap-1">
                    <label className="text-label-md font-medium text-on-surface-variant">Modèle de regroupement</label>
                    <select className={inputCls} value={groupSource} onChange={(e) => { setGroupSource(e.target.value); setGroupField(""); }}>
                      {filled.map((s) => <option key={s.id} value={s.id}>{s.model}</option>)}
                    </select>
                  </div>
                )}
                <div className="flex flex-col gap-1">
                  <label className="text-label-md font-medium text-on-surface-variant">Regrouper par</label>
                  <select className={inputCls} value={groupField} onChange={(e) => setGroupField(e.target.value)}>
                    <option value="">Choisir une colonne…</option>
                    {groupFields.map((f) => <option key={f.name} value={f.name}>{f.name}</option>)}
                  </select>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-label-md font-medium text-on-surface-variant">Trier par</label>
                  <select className={inputCls} value={order} onChange={(e) => setOrder(e.target.value)}>
                    {ORDER_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-label-md font-medium text-on-surface-variant">{type === "groupby" ? "Nombre max de catégories" : "Nombre de lignes (top N)"}</label>
                  <input type="number" min={1} max={200} className={inputCls} value={limit} onChange={(e) => setLimit(Number(e.target.value))} />
                </div>
                {type === "groupby" && (
                  <div className="flex flex-col gap-1">
                    <label className="text-label-md font-medium text-on-surface-variant">Rendu</label>
                    <select className={inputCls} value={render} onChange={(e) => setRender(e.target.value)}>
                      {RENDER_OPTIONS.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
                    </select>
                  </div>
                )}
              </div>
              <label className={`flex items-center gap-2 text-label-md ${measureIsAdditive ? "text-on-surface-variant" : "text-on-surface-variant/40"}`}>
                <input type="checkbox" checked={others && measureIsAdditive} disabled={!measureIsAdditive} onChange={(e) => setOthers(e.target.checked)} />
                Regrouper le reste (au-delà du Top-N) dans « Autres »{measureIsAdditive ? "" : " — seulement pour Nombre/Somme"}
              </label>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-label-md font-medium text-on-surface-variant">Ne garder que les groupes dont la valeur</span>
                <select className={`${inputCls} w-auto`} value={havingOp} onChange={(e) => setHavingOp(e.target.value)}>
                  <option value="">(tous)</option>
                  {OPERATORS.slice(0, 6).map((op) => <option key={op.value} value={op.value}>{op.label}</option>)}
                </select>
                {havingOp && <input type="number" className={`${inputCls} w-32`} value={havingVal} onChange={(e) => setHavingVal(e.target.value)} placeholder="Valeur" />}
              </div>
            </div>
          )}

          {filled.length > 0 && (type === "groupby" || type === "table") && (
            <div className="space-y-2 rounded-xl border border-outline-variant p-3">
              <p className="text-label-md font-medium text-on-surface-variant">Référence pour l&apos;affichage (optionnel)</p>
              <p className="text-label-sm text-on-surface-variant/60">Si la colonne de regroupement est un identifiant, résolvez-le en libellé lisible via un autre modèle.</p>
              <select className={inputCls} value={refModel} onChange={(e) => { setRefModel(e.target.value); setRefJoin(""); setRefLabel(""); }}>
                <option value="">Aucune référence (afficher la valeur brute)</option>
                {modelsOf(sources, spec.provider).map((m) => <option key={m.name} value={m.name}>{m.name}</option>)}
              </select>
              {refModel && (
                <div className="grid grid-cols-2 gap-2">
                  <div className="flex flex-col gap-1">
                    <label className="text-label-sm text-on-surface-variant">Colonne de jointure</label>
                    <select className={inputCls} value={refJoin} onChange={(e) => setRefJoin(e.target.value)}>
                      <option value="">Choisir…</option>
                      {fieldsOf(sources, spec.provider, refModel).map((f) => <option key={f.name} value={f.name}>{f.name}</option>)}
                    </select>
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-label-sm text-on-surface-variant">Colonne d&apos;affichage</label>
                    <select className={inputCls} value={refLabel} onChange={(e) => setRefLabel(e.target.value)}>
                      <option value="">Choisir…</option>
                      {fieldsOf(sources, spec.provider, refModel).map((f) => <option key={f.name} value={f.name}>{f.name}</option>)}
                    </select>
                  </div>
                </div>
              )}
            </div>
          )}

          {filled.length > 0 && (type === "timeseries" || type === "trend") && (
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-1">
                <label className="text-label-md font-medium text-on-surface-variant">Granularité</label>
                <select className={inputCls} value={granularity} onChange={(e) => setGranularity(e.target.value)}>
                  {GRANULARITIES.map((g) => <option key={g.value} value={g.value}>{g.label}</option>)}
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-label-md font-medium text-on-surface-variant">Nombre de périodes</label>
                <input type="number" min={2} max={366} className={inputCls} value={buckets} onChange={(e) => setBuckets(Number(e.target.value))} />
              </div>
            </div>
          )}

          {filled.length > 0 && type === "gauge" && (
            <div className="space-y-3 rounded-xl border border-outline-variant p-3">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="flex flex-col gap-1">
                  <label className="text-label-md font-medium text-on-surface-variant">Objectif (cible)</label>
                  <input type="number" className={inputCls} value={target} onChange={(e) => setTarget(e.target.value)} placeholder="Ex. 100" />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-label-md font-medium text-on-surface-variant">Sens favorable</label>
                  <select className={inputCls} value={direction} onChange={(e) => setDirection(e.target.value)}>
                    <option value="higher">Plus c&apos;est haut, mieux c&apos;est</option>
                    <option value="lower">Plus c&apos;est bas, mieux c&apos;est</option>
                  </select>
                </div>
              </div>
              <div>
                <p className="text-label-md font-medium text-on-surface-variant">Seuils de couleur (% de la cible)</p>
                <p className="text-label-sm text-on-surface-variant/60">
                  {direction === "lower"
                    ? "Vert jusqu'au seuil « bon », orange jusqu'au seuil « alerte », rouge au-delà."
                    : "Vert au-dessus du seuil « bon », orange au-dessus du seuil « alerte », rouge en dessous."}
                </p>
                <div className="mt-2 grid gap-4 sm:grid-cols-2">
                  <div className="flex flex-col gap-1">
                    <label className="text-label-sm text-on-surface-variant">Seuil « bon » {direction === "lower" ? "≤" : "≥"} (%)</label>
                    <input type="number" min={0} className={inputCls} value={goodPct} onChange={(e) => setGoodPct(e.target.value)} placeholder="100" />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-label-sm text-on-surface-variant">Seuil « alerte » {direction === "lower" ? "≤" : "≥"} (%)</label>
                    <input type="number" min={0} className={inputCls} value={warnPct} onChange={(e) => setWarnPct(e.target.value)} placeholder={direction === "lower" ? "140" : "60"} />
                  </div>
                </div>
              </div>
            </div>
          )}

          {filled.length > 0 && (type === "count" || type === "gauge") && (
            <DetailColumnsSection
              catalog={sources}
              spec={spec}
              cols={detailCols}
              onCols={setDetailCols}
              searchAll={searchAll}
              onSearchAll={setSearchAll}
              searchSel={searchSel}
              onSearchSel={setSearchSel}
              onPreview={doPreview}
              preview={preview}
              previewErr={previewErr}
              previewing={previewing}
            />
          )}
          {filled.length > 0 && ["groupby", "table", "timeseries", "trend"].includes(type) && (
            <p className="rounded-xl border border-outline-variant p-3 text-label-sm text-on-surface-variant/70">
              La vue détaillée (« Voir plus ») affichera automatiquement les <strong>données agrégées</strong> de ce widget
              ({type === "timeseries" || type === "trend" ? "période → valeur" : "catégorie → valeur"}), avec recherche et export CSV.
            </p>
          )}
        </>
      )}

      {err && <p className="rounded-xl bg-error-container/40 px-3 py-2 text-body-sm text-error">{err}</p>}

      <div className="flex gap-3 border-t border-outline-variant pt-4">
        <button type="submit" disabled={saving}
          className="rounded-xl bg-primary px-6 py-2 text-body-md font-medium text-on-primary transition-colors hover:bg-primary-container disabled:opacity-50">
          {saving ? "Enregistrement…" : isEdit ? "Enregistrer" : "Créer le widget"}
        </button>
        <button type="button" onClick={onCancel} disabled={saving}
          className="rounded-xl border border-outline-variant px-6 py-2 text-body-md text-on-surface-variant transition-colors hover:bg-surface-container disabled:opacity-50">Annuler</button>
      </div>
    </form>
  );
}
