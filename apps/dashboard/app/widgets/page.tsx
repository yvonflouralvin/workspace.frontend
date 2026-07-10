"use client";

import { useCallback, useEffect, useState } from "react";
import { AddOutlined, DeleteOutlined, NumbersOutlined, WidgetsOutlined } from "@mui/icons-material";
import { RightDrawer } from "@repo/ui/RightDrawer";
import { DashboardShell } from "@/components/DashboardShell";
import {
  getWidgets,
  createWidget,
  deleteWidget,
  getWidgetData,
  getSources,
  type Widget,
  type DataSourceApp,
} from "@/lib/dashboard-api";
import { accentFor } from "@/lib/app-accent";

const nf = new Intl.NumberFormat("fr-FR");
const inputCls =
  "w-full rounded-xl border border-outline-variant bg-surface-container-lowest px-3 py-2 text-body-md text-on-surface focus:border-primary focus:outline-none";

export default function WidgetsPage() {
  const [widgets, setWidgets] = useState<Widget[]>([]);
  const [counts, setCounts] = useState<Record<number, number | null | undefined>>({});
  const [sources, setSources] = useState<DataSourceApp[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [createOpen, setCreateOpen] = useState(false);

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
              return (
                <div key={w.id}
                  className="group relative flex flex-col gap-3 rounded-2xl border border-outline-variant bg-surface-container-lowest p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-body-md font-semibold text-on-surface">{w.title}</p>
                      <p className="mt-0.5 truncate font-mono text-label-md text-on-surface-variant">
                        {w.provider} · {w.model}
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
                  <button type="button" onClick={() => handleDelete(w.id)} title="Supprimer"
                    className="absolute bottom-3 right-3 rounded-lg p-1.5 text-on-surface-variant/40 opacity-0 transition-all hover:bg-error/8 hover:text-error group-hover:opacity-100">
                    <DeleteOutlined style={{ fontSize: 16 }} />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {createOpen && (
        <CreateWidgetDrawer
          sources={sources}
          onClose={() => setCreateOpen(false)}
          onCreated={(w) => { setWidgets((prev) => [w, ...prev]); setCreateOpen(false); }}
        />
      )}
    </DashboardShell>
  );
}

function CreateWidgetDrawer({
  sources,
  onClose,
  onCreated,
}: {
  sources: DataSourceApp[];
  onClose: () => void;
  onCreated: (w: Widget) => void;
}) {
  const [title, setTitle] = useState("");
  const [provider, setProvider] = useState("");
  const [model, setModel] = useState("");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const models = sources.find((s) => s.app_key === provider)?.models ?? [];

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !provider || !model) {
      setErr("Renseignez le titre, la source et le modèle.");
      return;
    }
    setSaving(true);
    setErr(null);
    try {
      const w = await createWidget({ type: "count", title: title.trim(), provider, model });
      onCreated(w);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Erreur.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <RightDrawer title="Nouveau widget" onClose={onClose}>
      <form onSubmit={submit} className="flex h-full flex-col gap-5">
        <div className="flex-1 space-y-4 overflow-y-auto">
          <div className="rounded-xl bg-surface-container px-3 py-2.5 text-body-sm text-on-surface-variant">
            Type : <span className="font-medium text-on-surface">Comptage</span> — affiche le nombre de lignes d&apos;un modèle.
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-label-md font-medium text-on-surface-variant">Titre</label>
            <input className={inputCls} value={title} onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex. Nombre de patients" />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-label-md font-medium text-on-surface-variant">Source de données</label>
            <select className={inputCls} value={provider}
              onChange={(e) => { setProvider(e.target.value); setModel(""); }}>
              <option value="">Choisir une application…</option>
              {sources.map((s) => (
                <option key={s.app_key} value={s.app_key}>{s.app_label}</option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-label-md font-medium text-on-surface-variant">Modèle</label>
            <select className={inputCls} value={model} disabled={!provider}
              onChange={(e) => setModel(e.target.value)}>
              <option value="">{provider ? "Choisir un modèle…" : "Choisir d'abord une source"}</option>
              {models.map((m) => (
                <option key={m.name} value={m.name}>{m.name}</option>
              ))}
            </select>
          </div>

          {err && <p className="rounded-xl bg-error-container/40 px-3 py-2 text-body-sm text-error">{err}</p>}
        </div>

        <div className="flex shrink-0 gap-3 border-t border-outline-variant pt-4">
          <button type="submit" disabled={saving}
            className="flex-1 rounded-xl bg-primary py-2 text-body-md font-medium text-on-primary transition-colors hover:bg-primary-container disabled:opacity-50">
            {saving ? "Création…" : "Créer le widget"}
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
