"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { AddOutlined, ArrowBackOutlined, ArrowDownwardOutlined, ArrowUpwardOutlined, CloseOutlined, EditOutlined, FullscreenOutlined, ReadMoreOutlined, SaveOutlined } from "@mui/icons-material";
import { DashboardShell } from "@/components/DashboardShell";
import { PeriodFilter } from "@/components/PeriodFilter";
import { WidgetView } from "@/components/WidgetView";
import { REFRESH_OPTIONS } from "@/lib/periods";
import { getBoard, getWidgetData, getWidgets, updateBoard, type Board, type Widget, type WidgetData } from "@/lib/dashboard-api";

type Item = { widget_id: number; w: number };
const SPAN: Record<number, string> = { 1: "sm:col-span-1", 2: "sm:col-span-2", 3: "sm:col-span-3" };

export default function BoardPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = Number(params.id);

  const [board, setBoard] = useState<Board | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [name, setName] = useState("");
  const [dataById, setDataById] = useState<Record<number, WidgetData | undefined>>({});
  const [widgetsById, setWidgetsById] = useState<Record<number, Widget>>({});
  const [allWidgets, setAllWidgets] = useState<Widget[]>([]);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [refreshMs, setRefreshMs] = useState(0);
  const [filterField, setFilterField] = useState("");
  const [filterValue, setFilterValue] = useState("");
  const [gf, setGf] = useState<{ field: string; value: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const boardRef = useRef<HTMLDivElement>(null);

  const goFullscreen = () => { boardRef.current?.requestFullscreen?.().catch(() => {}); };

  const applyBoard = useCallback((b: Board) => {
    setBoard(b); setName(b.name);
    setItems(b.items.map((it) => ({ widget_id: it.widget_id, w: it.w })));
    setWidgetsById((prev) => { const m = { ...prev }; b.items.forEach((it) => { m[it.widget_id] = it.widget; }); return m; });
  }, []);

  useEffect(() => {
    getBoard(id).then(applyBoard).catch((e) => setError(e instanceof Error ? e.message : "Introuvable."));
  }, [id, applyBoard]);

  const fetchAll = useCallback(() => {
    items.forEach((it) => {
      getWidgetData(it.widget_id, from || undefined, to || undefined, gf?.field, gf?.value)
        .then((d) => setDataById((prev) => ({ ...prev, [it.widget_id]: d })))
        .catch(() => setDataById((prev) => ({ ...prev, [it.widget_id]: undefined })));
    });
  }, [items, from, to, gf]);
  useEffect(() => { fetchAll(); }, [fetchAll]);

  useEffect(() => {
    if (!refreshMs) return;
    const t = setInterval(fetchAll, refreshMs);
    return () => clearInterval(t);
  }, [refreshMs, fetchAll]);

  function startEdit() {
    setEditing(true);
    if (allWidgets.length === 0) getWidgets().then((r) => { setAllWidgets(r.widgets); setWidgetsById((prev) => { const m = { ...prev }; r.widgets.forEach((w) => { m[w.id] = w; }); return m; }); }).catch(() => {});
  }
  function cancelEdit() { if (board) applyBoard(board); setEditing(false); }

  const move = (i: number, d: number) => setItems((prev) => { const a = [...prev]; const j = i + d; if (j < 0 || j >= a.length) return prev; [a[i], a[j]] = [a[j], a[i]]; return a; });
  const setW = (i: number, w: number) => setItems((prev) => prev.map((it, idx) => (idx === i ? { ...it, w } : it)));
  const removeAt = (i: number) => setItems((prev) => prev.filter((_, idx) => idx !== i));
  const addWidget = (wid: number) => setItems((prev) => (wid && !prev.some((it) => it.widget_id === wid) ? [...prev, { widget_id: wid, w: 1 }] : prev));

  async function save() {
    setSaving(true); setError(null);
    try {
      await updateBoard(id, { name: name.trim() || "Sans titre", items });
      const b = await getBoard(id);
      applyBoard(b); setEditing(false);
    } catch (e) { setError(e instanceof Error ? e.message : "Erreur."); }
    finally { setSaving(false); }
  }

  const available = useMemo(() => allWidgets.filter((w) => !items.some((it) => it.widget_id === w.id)), [allWidgets, items]);

  return (
    <DashboardShell>
      <div ref={boardRef} className="p-4 md:p-6 max-w-[1200px] mx-auto w-full overflow-auto bg-background">
        <div className="mb-4 flex items-center justify-between gap-3">
          <button type="button" onClick={() => router.push("/boards")} className="inline-flex items-center gap-1.5 text-body-sm text-on-surface-variant hover:text-on-surface">
            <ArrowBackOutlined style={{ fontSize: 18 }} /> Tableaux de bord
          </button>
          <div className="flex items-center gap-2">
            {!editing ? (
              <>
                <button type="button" onClick={goFullscreen} title="Plein écran (mode TV)" className="inline-flex items-center gap-1.5 rounded-xl border border-outline-variant px-3 py-1.5 text-body-sm text-on-surface-variant hover:bg-surface-container hover:text-on-surface"><FullscreenOutlined style={{ fontSize: 16 }} /> Plein écran</button>
                <button type="button" onClick={startEdit} className="inline-flex items-center gap-1.5 rounded-xl border border-outline-variant px-3 py-1.5 text-body-sm text-on-surface-variant hover:bg-surface-container hover:text-on-surface"><EditOutlined style={{ fontSize: 16 }} /> Modifier</button>
              </>
            ) : (
              <>
                <button type="button" onClick={cancelEdit} className="rounded-xl border border-outline-variant px-3 py-1.5 text-body-sm text-on-surface-variant hover:bg-surface-container">Annuler</button>
                <button type="button" onClick={save} disabled={saving} className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-3 py-1.5 text-body-sm font-medium text-on-primary hover:bg-primary-container disabled:opacity-50"><SaveOutlined style={{ fontSize: 16 }} /> {saving ? "…" : "Enregistrer"}</button>
              </>
            )}
          </div>
        </div>

        <div className="mb-4 flex flex-wrap items-end justify-between gap-4">
          {editing ? (
            <input value={name} onChange={(e) => setName(e.target.value)} className="rounded-xl border border-outline-variant bg-surface-container-lowest px-3 py-2 text-headline-sm text-on-surface focus:border-primary focus:outline-none" />
          ) : (
            <h1 className="text-headline-lg font-display text-on-surface">{name}</h1>
          )}
          <div className="flex flex-wrap items-center gap-3">
            <PeriodFilter from={from} to={to} onChange={(f, t) => { setFrom(f); setTo(t); }} />
            <select value={refreshMs} onChange={(e) => setRefreshMs(Number(e.target.value))} className="rounded-xl border border-outline-variant bg-surface-container-lowest px-2.5 py-1.5 text-body-sm text-on-surface focus:border-primary focus:outline-none">
              {REFRESH_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
        </div>

        {error && <p className="mb-4 rounded-xl bg-error-container/40 px-4 py-3 text-body-sm text-error">{error}</p>}

        {!editing && items.length > 0 && (
          <div className="mb-4 flex flex-wrap items-center gap-2 rounded-xl border border-outline-variant p-3">
            <span className="text-label-md font-medium text-on-surface-variant">Filtre global :</span>
            <input value={filterField} onChange={(e) => setFilterField(e.target.value)} placeholder="champ (ex. statut)"
              className="w-40 rounded-xl border border-outline-variant bg-surface-container-lowest px-3 py-1.5 text-body-sm text-on-surface focus:border-primary focus:outline-none" />
            <span className="text-on-surface-variant">=</span>
            <input value={filterValue} onChange={(e) => setFilterValue(e.target.value)} placeholder="valeur (ex. VALIDEE)"
              className="w-40 rounded-xl border border-outline-variant bg-surface-container-lowest px-3 py-1.5 text-body-sm text-on-surface focus:border-primary focus:outline-none" />
            <button type="button" onClick={() => setGf(filterField.trim() && filterValue.trim() ? { field: filterField.trim(), value: filterValue.trim() } : null)}
              className="rounded-xl bg-primary px-3 py-1.5 text-body-sm font-medium text-on-primary hover:bg-primary-container">Appliquer</button>
            {gf && <button type="button" onClick={() => { setGf(null); setFilterField(""); setFilterValue(""); }} className="text-label-md text-primary hover:opacity-70">Effacer</button>}
            <span className="text-label-sm text-on-surface-variant/60">{gf ? `actif : ${gf.field} = ${gf.value} · ` : ""}appliqué aux widgets ayant ce champ</span>
          </div>
        )}

        {editing && (
          <div className="mb-4 flex flex-wrap items-center gap-2 rounded-xl border border-outline-variant p-3">
            <span className="text-label-md font-medium text-on-surface-variant">Ajouter un widget :</span>
            <select className="rounded-xl border border-outline-variant bg-surface-container-lowest px-3 py-1.5 text-body-sm text-on-surface focus:border-primary focus:outline-none"
              value="" onChange={(e) => { addWidget(Number(e.target.value)); }}>
              <option value="">Choisir…</option>
              {available.map((w) => <option key={w.id} value={w.id}>{w.title}</option>)}
            </select>
            {available.length === 0 && <span className="text-label-md text-on-surface-variant/60">Tous les widgets sont déjà sur ce tableau.</span>}
          </div>
        )}

        {items.length === 0 ? (
          <div className="flex h-48 items-center justify-center rounded-2xl border border-dashed border-outline-variant text-body-md text-on-surface-variant">Aucun widget. {editing ? "Ajoutez-en ci-dessus." : "Cliquez « Modifier » pour en ajouter."}</div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {items.map((it, i) => {
              const w = widgetsById[it.widget_id];
              return (
                <div key={`${it.widget_id}-${i}`} className={`${SPAN[it.w] ?? "sm:col-span-1"} flex flex-col gap-3 rounded-2xl border border-outline-variant bg-surface-container-lowest p-5`}>
                  <div className="flex items-start justify-between gap-2">
                    <p className="truncate text-body-md font-semibold text-on-surface">{w?.title ?? `#${it.widget_id}`}</p>
                    {!editing && <button type="button" onClick={() => router.push(`/widgets/${it.widget_id}`)} title="Voir plus" className="rounded-lg p-1 text-on-surface-variant/50 hover:text-primary"><ReadMoreOutlined style={{ fontSize: 16 }} /></button>}
                  </div>
                  {editing ? (
                    <div className="flex items-center gap-1 text-on-surface-variant">
                      <button type="button" onClick={() => move(i, -1)} className="rounded p-1 hover:bg-surface-container"><ArrowUpwardOutlined style={{ fontSize: 16 }} /></button>
                      <button type="button" onClick={() => move(i, 1)} className="rounded p-1 hover:bg-surface-container"><ArrowDownwardOutlined style={{ fontSize: 16 }} /></button>
                      <select value={it.w} onChange={(e) => setW(i, Number(e.target.value))} className="ml-1 rounded-lg border border-outline-variant bg-surface-container-lowest px-2 py-1 text-label-md">
                        <option value={1}>1 colonne</option><option value={2}>2 colonnes</option><option value={3}>3 colonnes</option>
                      </select>
                      <button type="button" onClick={() => removeAt(i)} className="ml-auto rounded p-1 hover:text-error"><CloseOutlined style={{ fontSize: 16 }} /></button>
                    </div>
                  ) : (
                    <WidgetView data={dataById[it.widget_id]} />
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </DashboardShell>
  );
}
