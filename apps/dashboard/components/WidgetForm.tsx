"use client";

import { useState, type ReactNode } from "react";
import { AddOutlined, BarChartOutlined, CategoryOutlined, CloseOutlined, LeaderboardOutlined, NumbersOutlined, PercentOutlined, SpeedOutlined, TimelineOutlined, TrendingUpOutlined } from "@mui/icons-material";
import {
  createWidget,
  updateWidget,
  type Widget,
  type DataSourceApp,
  type SourceField,
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

export const WIDGET_TYPES = [
  { value: "count", label: "Comptage", description: "Le nombre — ou une somme/moyenne — d'un modèle, filtrable." },
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

const RENDER_OPTIONS = [
  { value: "numbers_row", label: "Chiffres (ligne)" },
  { value: "numbers_column", label: "Chiffres (colonne)" },
  { value: "bar_vertical", label: "Histogramme (vertical)" },
  { value: "bar_horizontal", label: "Histogramme (horizontal)" },
  { value: "pie", label: "Camembert" },
];

type Condition = { field: string; operator: string; value: string };
type Serie = { label: string; provider: string; model: string; measure: string; field: string; conditions: Condition[] };

function cleanConditions(conds: Condition[]) {
  return conds
    .filter((c) => c.field && c.operator)
    .map((c) => (NO_VALUE.has(c.operator) ? { field: c.field, operator: c.operator } : c));
}

function ConditionsEditor({ fields, conditions, onChange }: { fields: SourceField[]; conditions: Condition[]; onChange: (c: Condition[]) => void }) {
  const fieldDef = (name: string) => fields.find((f) => f.name === name);
  const update = (i: number, patch: Partial<Condition>) => onChange(conditions.map((c, idx) => (idx === i ? { ...c, ...patch } : c)));

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-label-md font-medium text-on-surface-variant">Conditions</span>
        <button type="button" onClick={() => onChange([...conditions, { field: fields[0]?.name ?? "", operator: "eq", value: "" }])}
          className="inline-flex items-center gap-1 text-label-md text-primary hover:opacity-70">
          <AddOutlined style={{ fontSize: 16 }} /> Ajouter
        </button>
      </div>
      {conditions.length === 0 && <p className="text-label-md text-on-surface-variant/60">Aucune condition — compte toutes les lignes.</p>}
      {conditions.map((cond, i) => {
        const fdef = fieldDef(cond.field);
        const isEnum = !!fdef?.values?.length && (cond.operator === "eq" || cond.operator === "ne");
        return (
          <div key={i} className="relative rounded-xl border border-outline-variant p-3 pr-9">
            <button type="button" onClick={() => onChange(conditions.filter((_, idx) => idx !== i))}
              className="absolute right-2 top-2 rounded p-1 text-on-surface-variant/50 hover:text-error"><CloseOutlined style={{ fontSize: 16 }} /></button>
            <select className={`${inputCls} mb-2`} value={cond.field} onChange={(e) => update(i, { field: e.target.value })}>
              {fields.map((f) => <option key={f.name} value={f.name}>{f.name}</option>)}
            </select>
            <div className="grid grid-cols-[auto_1fr] items-center gap-2">
              <select className={inputCls} value={cond.operator} onChange={(e) => update(i, { operator: e.target.value })}>
                {OPERATORS.map((op) => <option key={op.value} value={op.value}>{op.label}</option>)}
              </select>
              {NO_VALUE.has(cond.operator) ? (
                <span className="text-body-sm text-on-surface-variant/60">(sans valeur)</span>
              ) : isEnum ? (
                <select className={inputCls} value={cond.value} onChange={(e) => update(i, { value: e.target.value })}>
                  <option value="">Valeur…</option>
                  {fdef!.values!.map((v) => <option key={v} value={v}>{v}</option>)}
                </select>
              ) : (
                <input className={inputCls} value={cond.value} onChange={(e) => update(i, { value: e.target.value })} placeholder="Valeur" />
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function MeasureFields({ fields, measure, field, onChange }: { fields: SourceField[]; measure: string; field: string; onChange: (patch: { measure?: string; field?: string }) => void }) {
  const nums = numericFields(fields);
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      <div className="flex flex-col gap-1">
        <label className="text-label-md font-medium text-on-surface-variant">Mesure</label>
        <select className={inputCls} value={measure}
          onChange={(e) => onChange(NEEDS_FIELD.has(e.target.value) ? { measure: e.target.value } : { measure: e.target.value, field: "" })}>
          {MEASURES.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
        </select>
      </div>
      {NEEDS_FIELD.has(measure) && (
        <div className="flex flex-col gap-1">
          <label className="text-label-md font-medium text-on-surface-variant">Champ (numérique)</label>
          <select className={inputCls} value={field} onChange={(e) => onChange({ field: e.target.value })}>
            <option value="">Choisir un champ…</option>
            {nums.map((f) => <option key={f.name} value={f.name}>{f.name}</option>)}
          </select>
        </div>
      )}
    </div>
  );
}

const emptySerie = (): Serie => ({ label: "", provider: "", model: "", measure: "count", field: "", conditions: [] });

function applyPatch(s: Serie, p: Partial<Serie>): Serie {
  const next = { ...s, ...p };
  if (p.provider !== undefined && p.provider !== s.provider) { next.model = ""; next.field = ""; next.conditions = []; }
  if (p.model !== undefined && p.model !== s.model) { next.field = ""; next.conditions = []; }
  return next;
}

function AggregateSpecEditor({ label, hint, spec, onChange, sources }: { label: string; hint?: string; spec: Serie; onChange: (patch: Partial<Serie>) => void; sources: DataSourceApp[] }) {
  const modelsOf = (prov: string) => sources.find((s) => s.app_key === prov)?.models ?? [];
  const fieldsOf = (prov: string, mod: string) => modelsOf(prov).find((m) => m.name === mod)?.fields ?? [];
  return (
    <div className="space-y-2 rounded-xl border border-outline-variant p-4">
      <div>
        <p className="text-label-md font-medium text-on-surface-variant">{label}</p>
        {hint && <p className="text-label-sm text-on-surface-variant/60">{hint}</p>}
      </div>
      <div className="grid grid-cols-2 gap-2">
        <select className={inputCls} value={spec.provider} onChange={(e) => onChange({ provider: e.target.value })}>
          <option value="">Source…</option>
          {sources.map((src) => <option key={src.app_key} value={src.app_key}>{src.app_label}</option>)}
        </select>
        <select className={inputCls} value={spec.model} disabled={!spec.provider} onChange={(e) => onChange({ model: e.target.value })}>
          <option value="">Modèle…</option>
          {modelsOf(spec.provider).map((m) => <option key={m.name} value={m.name}>{m.name}</option>)}
        </select>
      </div>
      {spec.model && (
        <>
          <MeasureFields fields={fieldsOf(spec.provider, spec.model)} measure={spec.measure} field={spec.field} onChange={onChange} />
          <ConditionsEditor fields={fieldsOf(spec.provider, spec.model)} conditions={spec.conditions} onChange={(c) => onChange({ conditions: c })} />
        </>
      )}
    </div>
  );
}

export function WidgetForm({ sources, widget, initialType, onSaved, onCancel }: { sources: DataSourceApp[]; widget?: Widget; initialType?: string; onSaved: (w: Widget) => void; onCancel: () => void }) {
  const isEdit = !!widget;
  const cfg = (widget?.config ?? {}) as { conditions?: Condition[]; measure?: string; field?: string; render?: string; series?: Serie[] };

  const [type, setType] = useState<string>(widget?.type ?? initialType ?? "count");
  const [title, setTitle] = useState(widget?.title ?? "");
  const [provider, setProvider] = useState(widget?.provider ?? "");
  const [model, setModel] = useState(widget?.model ?? "");
  const [measure, setMeasure] = useState<string>(cfg.measure ?? "count");
  const [field, setField] = useState<string>(cfg.field ?? "");
  const [conditions, setConditions] = useState<Condition[]>(
    Array.isArray(cfg.conditions) ? cfg.conditions.map((c) => ({ field: c.field ?? "", operator: c.operator ?? "eq", value: c.value ?? "" })) : [],
  );
  const [target, setTarget] = useState<string>((cfg as { target?: number }).target !== undefined ? String((cfg as { target?: number }).target) : "");
  const [direction, setDirection] = useState<string>((cfg as { direction?: string }).direction ?? "higher");
  const thCfg = (cfg as { thresholds?: { good?: number; warn?: number } }).thresholds ?? {};
  const [goodPct, setGoodPct] = useState<string>(thCfg.good !== undefined ? String(thCfg.good) : "");
  const [warnPct, setWarnPct] = useState<string>(thCfg.warn !== undefined ? String(thCfg.warn) : "");
  const [limit, setLimit] = useState<number>((cfg as { limit?: number }).limit ?? 10);
  const ratioCfg = cfg as { numerator?: Serie; denominator?: Serie; format?: string };
  const initSpec = (s?: Serie): Serie => ({ ...emptySerie(), ...(s ?? {}), conditions: (s?.conditions ?? []).map((c) => ({ field: c.field ?? "", operator: c.operator ?? "eq", value: c.value ?? "" })) });
  const [numerator, setNumerator] = useState<Serie>(initSpec(ratioCfg.numerator));
  const [denominator, setDenominator] = useState<Serie>(initSpec(ratioCfg.denominator));
  const [ratioFormat, setRatioFormat] = useState<string>(ratioCfg.format ?? "percent");
  const [granularity, setGranularity] = useState<string>((cfg as { granularity?: string }).granularity ?? "month");
  const [buckets, setBuckets] = useState<number>((cfg as { buckets?: number }).buckets ?? 12);
  const [groupByCol, setGroupByCol] = useState<string>((cfg as { group_by?: string }).group_by ?? "");
  const refCfg = (cfg as { reference?: { model?: string; join_field?: string; label_field?: string } }).reference ?? {};
  const [refModel, setRefModel] = useState<string>(refCfg.model ?? "");
  const [refJoin, setRefJoin] = useState<string>(refCfg.join_field ?? "");
  const [refLabel, setRefLabel] = useState<string>(refCfg.label_field ?? "");
  const [render, setRender] = useState<string>(cfg.render ?? "bar_vertical");
  const [series, setSeries] = useState<Serie[]>(
    Array.isArray(cfg.series)
      ? cfg.series.map((s) => ({ label: s.label ?? "", provider: s.provider ?? "", model: s.model ?? "", measure: s.measure ?? "count", field: s.field ?? "", conditions: (s.conditions ?? []).map((c) => ({ field: c.field ?? "", operator: c.operator ?? "eq", value: c.value ?? "" })) }))
      : [],
  );
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const typeMeta = WIDGET_TYPES.find((t) => t.value === type) ?? { label: "Widget", description: "" };

  const modelsOf = (prov: string) => sources.find((s) => s.app_key === prov)?.models ?? [];
  const fieldsOf = (prov: string, mod: string) => modelsOf(prov).find((m) => m.name === mod)?.fields ?? [];
  const updateSerie = (i: number, patch: Partial<Serie>) => setSeries((prev) => prev.map((s, idx) => (idx === i ? { ...s, ...patch } : s)));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    let input;
    if (type === "comparison") {
      if (!title.trim() || series.length === 0) { setErr("Titre et au moins une source requis."); return; }
      if (series.some((s) => !s.provider || !s.model)) { setErr("Chaque source doit avoir une application et un modèle."); return; }
      if (series.some((s) => NEEDS_FIELD.has(s.measure) && !s.field)) { setErr("Choisissez le champ à agréger pour chaque source."); return; }
      input = {
        type: "comparison", title: title.trim(),
        config: { render, series: series.map((s) => ({ label: s.label.trim() || s.model, provider: s.provider, model: s.model, measure: s.measure, field: NEEDS_FIELD.has(s.measure) ? s.field : undefined, conditions: cleanConditions(s.conditions) })) },
      };
    } else if (type === "ratio") {
      if (!title.trim()) { setErr("Titre requis."); return; }
      for (const [name, s] of [["numérateur", numerator], ["dénominateur", denominator]] as const) {
        if (!s.provider || !s.model) { setErr(`Choisissez la source et le modèle du ${name}.`); return; }
        if (NEEDS_FIELD.has(s.measure) && !s.field) { setErr(`Choisissez le champ à agréger du ${name}.`); return; }
      }
      const packSpec = (s: Serie) => ({ provider: s.provider, model: s.model, measure: s.measure, field: NEEDS_FIELD.has(s.measure) ? s.field : undefined, conditions: cleanConditions(s.conditions) });
      input = { type: "ratio", title: title.trim(), config: { numerator: packSpec(numerator), denominator: packSpec(denominator), format: ratioFormat } };
    } else {
      if (!title.trim() || !provider || !model) { setErr("Titre, source et modèle requis."); return; }
      if (NEEDS_FIELD.has(measure) && !field) { setErr("Choisissez le champ à agréger."); return; }
      if ((type === "groupby" || type === "table") && !groupByCol) { setErr("Choisissez la colonne de regroupement."); return; }
      if (type === "gauge" && !Number.isFinite(Number(target))) { setErr("Renseignez un objectif (cible) numérique."); return; }
      const baseConfig = { measure, field: NEEDS_FIELD.has(measure) ? field : undefined, conditions: cleanConditions(conditions) };
      const reference = refModel && refJoin && refLabel ? { model: refModel, join_field: refJoin, label_field: refLabel } : undefined;
      const thDefaults = direction === "lower" ? { good: 100, warn: 140 } : { good: 100, warn: 60 };
      const thresholds = goodPct !== "" || warnPct !== ""
        ? { good: goodPct !== "" ? Number(goodPct) : thDefaults.good, warn: warnPct !== "" ? Number(warnPct) : thDefaults.warn }
        : undefined;
      input =
        type === "timeseries" || type === "trend"
          ? { type, title: title.trim(), provider, model, config: { ...baseConfig, granularity, buckets: Math.max(2, Math.min(Number(buckets) || 12, 366)) } }
          : type === "groupby"
            ? { type: "groupby", title: title.trim(), provider, model, config: { ...baseConfig, group_by: groupByCol, render, reference } }
            : type === "table"
              ? { type: "table", title: title.trim(), provider, model, config: { ...baseConfig, group_by: groupByCol, limit: Math.max(1, Math.min(Number(limit) || 10, 200)), reference } }
              : type === "gauge"
                ? { type: "gauge", title: title.trim(), provider, model, config: { ...baseConfig, target: Number(target), direction, thresholds } }
                : { type: "count", title: title.trim(), provider, model, config: baseConfig };
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
          <AggregateSpecEditor label="Numérateur (la part)" hint="Ex. commandes payées." spec={numerator} onChange={(p) => setNumerator((s) => applyPatch(s, p))} sources={sources} />
          <AggregateSpecEditor label="Dénominateur (le total)" hint="Ex. toutes les commandes." spec={denominator} onChange={(p) => setDenominator((s) => applyPatch(s, p))} sources={sources} />
          <div className="flex flex-col gap-1">
            <label className="text-label-md font-medium text-on-surface-variant">Format</label>
            <select className={inputCls} value={ratioFormat} onChange={(e) => setRatioFormat(e.target.value)}>
              <option value="percent">Pourcentage (%)</option>
              <option value="ratio">Ratio (×)</option>
            </select>
          </div>
        </>
      ) : type !== "comparison" ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1">
              <label className="text-label-md font-medium text-on-surface-variant">Source de données</label>
              <select className={inputCls} value={provider} onChange={(e) => { setProvider(e.target.value); setModel(""); setConditions([]); setField(""); setGroupByCol(""); setRefModel(""); setRefJoin(""); setRefLabel(""); }}>
                <option value="">Choisir une application…</option>
                {sources.map((s) => <option key={s.app_key} value={s.app_key}>{s.app_label}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-label-md font-medium text-on-surface-variant">Modèle</label>
              <select className={inputCls} value={model} disabled={!provider} onChange={(e) => { setModel(e.target.value); setConditions([]); setField(""); setGroupByCol(""); }}>
                <option value="">{provider ? "Choisir un modèle…" : "Choisir d'abord une source"}</option>
                {modelsOf(provider).map((m) => <option key={m.name} value={m.name}>{m.name}</option>)}
              </select>
            </div>
          </div>
          {model && (
            <>
              {(type === "groupby" || type === "table") && (
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="flex flex-col gap-1">
                    <label className="text-label-md font-medium text-on-surface-variant">Regrouper par</label>
                    <select className={inputCls} value={groupByCol} onChange={(e) => setGroupByCol(e.target.value)}>
                      <option value="">Choisir une colonne…</option>
                      {categoricalFields(fieldsOf(provider, model)).map((f) => <option key={f.name} value={f.name}>{f.name}</option>)}
                    </select>
                  </div>
                  {type === "groupby" ? (
                    <div className="flex flex-col gap-1">
                      <label className="text-label-md font-medium text-on-surface-variant">Rendu</label>
                      <select className={inputCls} value={render} onChange={(e) => setRender(e.target.value)}>
                        {RENDER_OPTIONS.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
                      </select>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-1">
                      <label className="text-label-md font-medium text-on-surface-variant">Nombre de lignes (top N)</label>
                      <input type="number" min={1} max={200} className={inputCls} value={limit}
                        onChange={(e) => setLimit(Number(e.target.value))} />
                    </div>
                  )}
                </div>
              )}
              {(type === "groupby" || type === "table") && (
                <div className="space-y-2 rounded-xl border border-outline-variant p-3">
                  <p className="text-label-md font-medium text-on-surface-variant">Référence pour l&apos;affichage (optionnel)</p>
                  <p className="text-label-sm text-on-surface-variant/60">Si la colonne de regroupement est un identifiant, résolvez-le en libellé lisible via un autre modèle.</p>
                  <select className={inputCls} value={refModel} onChange={(e) => { setRefModel(e.target.value); setRefJoin(""); setRefLabel(""); }}>
                    <option value="">Aucune référence (afficher la valeur brute)</option>
                    {modelsOf(provider).map((m) => <option key={m.name} value={m.name}>{m.name}</option>)}
                  </select>
                  {refModel && (
                    <div className="grid grid-cols-2 gap-2">
                      <div className="flex flex-col gap-1">
                        <label className="text-label-sm text-on-surface-variant">Colonne de jointure</label>
                        <select className={inputCls} value={refJoin} onChange={(e) => setRefJoin(e.target.value)}>
                          <option value="">Choisir…</option>
                          {fieldsOf(provider, refModel).map((f) => <option key={f.name} value={f.name}>{f.name}</option>)}
                        </select>
                      </div>
                      <div className="flex flex-col gap-1">
                        <label className="text-label-sm text-on-surface-variant">Colonne d&apos;affichage</label>
                        <select className={inputCls} value={refLabel} onChange={(e) => setRefLabel(e.target.value)}>
                          <option value="">Choisir…</option>
                          {fieldsOf(provider, refModel).map((f) => <option key={f.name} value={f.name}>{f.name}</option>)}
                        </select>
                      </div>
                    </div>
                  )}
                </div>
              )}
              {(type === "timeseries" || type === "trend") && (
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="flex flex-col gap-1">
                    <label className="text-label-md font-medium text-on-surface-variant">Granularité</label>
                    <select className={inputCls} value={granularity} onChange={(e) => setGranularity(e.target.value)}>
                      {GRANULARITIES.map((g) => <option key={g.value} value={g.value}>{g.label}</option>)}
                    </select>
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-label-md font-medium text-on-surface-variant">Nombre de périodes</label>
                    <input type="number" min={2} max={366} className={inputCls} value={buckets}
                      onChange={(e) => setBuckets(Number(e.target.value))} />
                  </div>
                </div>
              )}
              <MeasureFields fields={fieldsOf(provider, model)} measure={measure} field={field}
                onChange={(p) => { if (p.measure !== undefined) setMeasure(p.measure); if (p.field !== undefined) setField(p.field); }} />
              {type === "gauge" && (
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
                        <input type="number" min={0} className={inputCls} value={goodPct} onChange={(e) => setGoodPct(e.target.value)} placeholder={direction === "lower" ? "100" : "100"} />
                      </div>
                      <div className="flex flex-col gap-1">
                        <label className="text-label-sm text-on-surface-variant">Seuil « alerte » {direction === "lower" ? "≤" : "≥"} (%)</label>
                        <input type="number" min={0} className={inputCls} value={warnPct} onChange={(e) => setWarnPct(e.target.value)} placeholder={direction === "lower" ? "140" : "60"} />
                      </div>
                    </div>
                  </div>
                </div>
              )}
              <ConditionsEditor fields={fieldsOf(provider, model)} conditions={conditions} onChange={setConditions} />
            </>
          )}
        </>
      ) : (
        <>
          <div className="flex flex-col gap-1">
            <label className="text-label-md font-medium text-on-surface-variant">Rendu</label>
            <select className={inputCls} value={render} onChange={(e) => setRender(e.target.value)}>
              {RENDER_OPTIONS.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
            </select>
          </div>

          <div className="flex items-center justify-between">
            <label className="text-label-md font-medium text-on-surface-variant">Sources à comparer</label>
            <button type="button" onClick={() => setSeries((prev) => [...prev, { label: "", provider: "", model: "", measure: "count", field: "", conditions: [] }])}
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
              <div className="grid grid-cols-2 gap-2">
                <select className={inputCls} value={s.provider} onChange={(e) => updateSerie(i, { provider: e.target.value, model: "", conditions: [] })}>
                  <option value="">Source…</option>
                  {sources.map((src) => <option key={src.app_key} value={src.app_key}>{src.app_label}</option>)}
                </select>
                <select className={inputCls} value={s.model} disabled={!s.provider} onChange={(e) => updateSerie(i, { model: e.target.value, conditions: [], field: "" })}>
                  <option value="">Modèle…</option>
                  {modelsOf(s.provider).map((m) => <option key={m.name} value={m.name}>{m.name}</option>)}
                </select>
              </div>
              {s.model && (
                <>
                  <MeasureFields fields={fieldsOf(s.provider, s.model)} measure={s.measure} field={s.field} onChange={(p) => updateSerie(i, p)} />
                  <ConditionsEditor fields={fieldsOf(s.provider, s.model)} conditions={s.conditions} onChange={(c) => updateSerie(i, { conditions: c })} />
                </>
              )}
            </div>
          ))}
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
