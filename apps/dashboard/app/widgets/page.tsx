"use client";

import { useCallback, useEffect, useState } from "react";
import { AddOutlined, CloseOutlined, DeleteOutlined, EditOutlined, NumbersOutlined, WidgetsOutlined } from "@mui/icons-material";
import { RightDrawer } from "@repo/ui/RightDrawer";
import { DashboardShell } from "@/components/DashboardShell";
import {
  getWidgets,
  createWidget,
  updateWidget,
  deleteWidget,
  getWidgetData,
  getSources,
  type Widget,
  type DataSourceApp,
  type SourceField,
} from "@/lib/dashboard-api";
import { accentFor } from "@/lib/app-accent";

const nf = new Intl.NumberFormat("fr-FR");
const inputCls =
  "w-full rounded-xl border border-outline-variant bg-surface-container-lowest px-3 py-2 text-body-md text-on-surface focus:border-primary focus:outline-none";

const OPERATORS = [
  { value: "eq", label: "=" },
  { value: "ne", label: "≠" },
  { value: "gt", label: ">" },
  { value: "gte", label: "≥" },
  { value: "lt", label: "<" },
  { value: "lte", label: "≤" },
  { value: "contains", label: "Contient" },
  { value: "starts_with", label: "Commence par" },
  { value: "ends_with", label: "Finit par" },
  { value: "is_true", label: "Est vrai" },
  { value: "is_false", label: "Est faux" },
];
const NO_VALUE = new Set(["is_true", "is_false"]);

type Condition = { field: string; operator: string; value: string };

export default function WidgetsPage() {
  const [widgets, setWidgets] = useState<Widget[]>([]);
  const [counts, setCounts] = useState<Record<number, number | null | undefined>>({});
  const [sources, setSources] = useState<DataSourceApp[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<Widget | null>(null);

  const load = useCallback(() => {
    getWidgets()
      .then((r) => setWidgets(r.widgets))
      .catch((e) => setError(e instanceof Error ? e.message : "Erreur de chargement."))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
    getSources().then((r) => setSources(r.sources)).catch(() => {});
  }, [load]);

  const fetchCount = useCallback(
    (id: number) => {
      getWidgetData(id, from || undefined, to || undefined)
        .then((d) => setCounts((prev) => ({ ...prev, [id]: d.count })))
        .catch(() => setCounts((prev) => ({ ...prev, [id]: null })));
    },
    [from, to],
  );

  useEffect(() => {
    widgets.forEach((w) => fetchCount(w.id));
  }, [widgets, fetchCount]);

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
            <p className="mt-1 text-body-md text-on-surface-variant">
              Créez des widgets à partir de vos sources de données.
            </p>
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
              <button type="button" onClick={() => { setFrom(""); setTo(""); }}
                className="text-label-md text-primary hover:opacity-70">Réinitialiser</button>
            )}
            <button type="button" onClick={() => setCreateOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-body-md font-medium text-on-primary transition-colors hover:bg-primary-container">
              <AddOutlined style={{ fontSize: 18 }} />
              Créer un widget
            </button>
          </div>
        </div>

        {error && (
          <p className="mb-4 rounded-xl bg-error-container/40 px-4 py-3 text-body-sm text-error">{error}</p>
        )}

        {loading ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-32 animate-pulse rounded-2xl bg-surface-container" />
            ))}
          </div>
        ) : widgets.length === 0 ? (
          <div className="flex h-64 flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-outline-variant text-center">
            <WidgetsOutlined style={{ fontSize: 40 }} className="text-on-surface-variant/30" />
            <p className="text-body-md text-on-surface-variant">Aucun widget pour l&apos;instant.</p>
            <button type="button" onClick={() => setCreateOpen(true)}
              className="text-body-sm text-primary underline underline-offset-2 hover:opacity-70">
              Créer votre premier widget
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {widgets.map((w) => {
              const accent = accentFor(w.provider);
              const c = counts[w.id];
              const nbCond = Array.isArray((w.config as { conditions?: unknown[] })?.conditions)
                ? ((w.config as { conditions: unknown[] }).conditions.length)
                : 0;
              return (
                <div key={w.id}
                  className="group relative flex flex-col gap-3 rounded-2xl border border-outline-variant bg-surface-container-lowest p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-body-md font-semibold text-on-surface">{w.title}</p>
                      <p className="mt-0.5 truncate font-mono text-label-md text-on-surface-variant">
                        {w.provider} · {w.model}{nbCond > 0 ? ` · ${nbCond} cond.` : ""}
                      </p>
                    </div>
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
                      style={{ backgroundColor: `color-mix(in srgb, ${accent} 12%, transparent)`, color: accent }}>
                      <NumbersOutlined style={{ fontSize: 18 }} />
                    </span>
                  </div>
                  <p className="text-3xl font-bold leading-none text-on-surface tabular-nums">
                    {c === undefined ? "…" : c === null ? "—" : nf.format(c)}
                  </p>
                  <div className="absolute bottom-3 right-3 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                    <button type="button" onClick={() => setEditing(w)} title="Modifier"
                      className="rounded-lg p-1.5 text-on-surface-variant/50 transition-colors hover:bg-surface-container hover:text-on-surface">
                      <EditOutlined style={{ fontSize: 16 }} />
                    </button>
                    <button type="button" onClick={() => handleDelete(w.id)} title="Supprimer"
                      className="rounded-lg p-1.5 text-on-surface-variant/50 transition-colors hover:bg-error/8 hover:text-error">
                      <DeleteOutlined style={{ fontSize: 16 }} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {(createOpen || editing) && (
        <WidgetDrawer
          sources={sources}
          widget={editing ?? undefined}
          onClose={() => { setCreateOpen(false); setEditing(null); }}
          onSaved={(w) => {
            setWidgets((prev) => (editing ? prev.map((x) => (x.id === w.id ? w : x)) : [w, ...prev]));
            fetchCount(w.id);
            setCreateOpen(false);
            setEditing(null);
          }}
        />
      )}
    </DashboardShell>
  );
}

function WidgetDrawer({
  sources,
  widget,
  onClose,
  onSaved,
}: {
  sources: DataSourceApp[];
  widget?: Widget;
  onClose: () => void;
  onSaved: (w: Widget) => void;
}) {
  const isEdit = !!widget;
  const initialConditions: Condition[] = Array.isArray(
    (widget?.config as { conditions?: unknown[] })?.conditions,
  )
    ? ((widget!.config as { conditions: Array<Record<string, string>> }).conditions).map((c) => ({
        field: c.field ?? "",
        operator: c.operator ?? "eq",
        value: c.value ?? "",
      }))
    : [];

  const [title, setTitle] = useState(widget?.title ?? "");
  const [provider, setProvider] = useState(widget?.provider ?? "");
  const [model, setModel] = useState(widget?.model ?? "");
  const [conditions, setConditions] = useState<Condition[]>(initialConditions);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const models = sources.find((s) => s.app_key === provider)?.models ?? [];
  const fields: SourceField[] = models.find((m) => m.name === model)?.fields ?? [];
  const fieldDef = (name: string) => fields.find((f) => f.name === name);

  function updateCond(i: number, patch: Partial<Condition>) {
    setConditions((prev) => prev.map((c, idx) => (idx === i ? { ...c, ...patch } : c)));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !provider || !model) {
      setErr("Renseignez le titre, la source et le modèle.");
      return;
    }
    const cleaned = conditions
      .filter((c) => c.field && c.operator)
      .map((c) => (NO_VALUE.has(c.operator) ? { field: c.field, operator: c.operator } : c));
    setSaving(true);
    setErr(null);
    const input = { type: "count", title: title.trim(), provider, model, config: { conditions: cleaned } };
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
    <RightDrawer title={isEdit ? "Modifier le widget" : "Nouveau widget"} onClose={onClose}>
      <form onSubmit={submit} className="flex h-full flex-col gap-5">
        <div className="flex-1 space-y-4 overflow-y-auto pr-1">
          <div className="rounded-xl bg-surface-container px-3 py-2.5 text-body-sm text-on-surface-variant">
            Type : <span className="font-medium text-on-surface">Comptage</span> — nombre de lignes d&apos;un modèle.
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-label-md font-medium text-on-surface-variant">Titre</label>
            <input className={inputCls} value={title} onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex. Commandes payées" />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-label-md font-medium text-on-surface-variant">Source de données</label>
            <select className={inputCls} value={provider}
              onChange={(e) => { setProvider(e.target.value); setModel(""); setConditions([]); }}>
              <option value="">Choisir une application…</option>
              {sources.map((s) => (
                <option key={s.app_key} value={s.app_key}>{s.app_label}</option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-label-md font-medium text-on-surface-variant">Modèle</label>
            <select className={inputCls} value={model} disabled={!provider}
              onChange={(e) => { setModel(e.target.value); setConditions([]); }}>
              <option value="">{provider ? "Choisir un modèle…" : "Choisir d'abord une source"}</option>
              {models.map((m) => (
                <option key={m.name} value={m.name}>{m.name}</option>
              ))}
            </select>
          </div>

          {model && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-label-md font-medium text-on-surface-variant">Conditions</label>
                <button type="button"
                  onClick={() => setConditions((prev) => [...prev, { field: fields[0]?.name ?? "", operator: "eq", value: "" }])}
                  className="inline-flex items-center gap-1 text-label-md text-primary hover:opacity-70">
                  <AddOutlined style={{ fontSize: 16 }} /> Ajouter
                </button>
              </div>

              {conditions.length === 0 && (
                <p className="text-label-md text-on-surface-variant/60">Aucune condition — compte toutes les lignes.</p>
              )}

              {conditions.map((cond, i) => {
                const fdef = fieldDef(cond.field);
                const isEnum = !!fdef?.values?.length && (cond.operator === "eq" || cond.operator === "ne");
                return (
                  <div key={i} className="relative rounded-xl border border-outline-variant p-3 pr-9">
                    <button type="button" onClick={() => setConditions((prev) => prev.filter((_, idx) => idx !== i))}
                      className="absolute right-2 top-2 rounded p-1 text-on-surface-variant/50 hover:text-error">
                      <CloseOutlined style={{ fontSize: 16 }} />
                    </button>
                    <select className={`${inputCls} mb-2`} value={cond.field}
                      onChange={(e) => updateCond(i, { field: e.target.value })}>
                      {fields.map((f) => (
                        <option key={f.name} value={f.name}>{f.name}</option>
                      ))}
                    </select>
                    <div className="grid grid-cols-[auto_1fr] items-center gap-2">
                      <select className={inputCls} value={cond.operator}
                        onChange={(e) => updateCond(i, { operator: e.target.value })}>
                        {OPERATORS.map((op) => (
                          <option key={op.value} value={op.value}>{op.label}</option>
                        ))}
                      </select>
                      {NO_VALUE.has(cond.operator) ? (
                        <span className="text-body-sm text-on-surface-variant/60">(sans valeur)</span>
                      ) : isEnum ? (
                        <select className={inputCls} value={cond.value}
                          onChange={(e) => updateCond(i, { value: e.target.value })}>
                          <option value="">Valeur…</option>
                          {fdef!.values!.map((v) => (
                            <option key={v} value={v}>{v}</option>
                          ))}
                        </select>
                      ) : (
                        <input className={inputCls} value={cond.value}
                          onChange={(e) => updateCond(i, { value: e.target.value })} placeholder="Valeur" />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {err && <p className="rounded-xl bg-error-container/40 px-3 py-2 text-body-sm text-error">{err}</p>}
        </div>

        <div className="flex shrink-0 gap-3 border-t border-outline-variant pt-4">
          <button type="submit" disabled={saving}
            className="flex-1 rounded-xl bg-primary py-2 text-body-md font-medium text-on-primary transition-colors hover:bg-primary-container disabled:opacity-50">
            {saving ? "Enregistrement…" : isEdit ? "Enregistrer" : "Créer le widget"}
          </button>
          <button type="button" onClick={onClose} disabled={saving}
            className="rounded-xl border border-outline-variant px-5 py-2 text-body-md text-on-surface-variant transition-colors hover:bg-surface-container disabled:opacity-50">
            Annuler
          </button>
        </div>
      </form>
    </RightDrawer>
  );
}
