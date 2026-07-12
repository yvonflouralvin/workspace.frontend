"use client";

import { useCallback, useEffect, useState } from "react";
import { AddOutlined, DeleteOutlined, NotificationsActiveOutlined, ScienceOutlined } from "@mui/icons-material";
import { createAlert, deleteAlert, getAlerts, testAlert, updateAlert, type Alert } from "@/lib/dashboard-api";

const OPS = [
  { value: "gt", label: "supérieure à (>)" },
  { value: "gte", label: "supérieure ou égale (≥)" },
  { value: "lt", label: "inférieure à (<)" },
  { value: "lte", label: "inférieure ou égale (≤)" },
  { value: "eq", label: "égale à (=)" },
  { value: "ne", label: "différente de (≠)" },
];
const opLabel = (o: string) => OPS.find((x) => x.value === o)?.label ?? o;
const input = "rounded-xl border border-outline-variant bg-surface-container-lowest px-3 py-2 text-body-sm text-on-surface focus:border-primary focus:outline-none";

export function AlertsPanel({ widgetId }: { widgetId: number }) {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [op, setOp] = useState("gt");
  const [threshold, setThreshold] = useState("");
  const [recipients, setRecipients] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    getAlerts(widgetId).then((r) => setAlerts(r.alerts)).catch(() => {});
  }, [widgetId]);
  useEffect(() => { load(); }, [load]);

  async function add() {
    setErr(null); setMsg(null);
    const recs = recipients.split(",").map((r) => r.trim()).filter(Boolean);
    if (!threshold || Number.isNaN(Number(threshold))) { setErr("Seuil numérique requis."); return; }
    if (!recs.length) { setErr("Au moins un email destinataire."); return; }
    setSaving(true);
    try {
      await createAlert({ widget_id: widgetId, operator: op, threshold: Number(threshold), recipients: recs, enabled: true });
      setThreshold(""); setRecipients("");
      load();
    } catch (e) { setErr(e instanceof Error ? e.message : "Erreur."); }
    finally { setSaving(false); }
  }

  async function toggle(a: Alert) {
    await updateAlert(a.id, { widget_id: a.widget_id, operator: a.operator, threshold: a.threshold, recipients: a.recipients, enabled: !a.enabled }).catch(() => {});
    load();
  }
  async function remove(id: number) { await deleteAlert(id).catch(() => {}); load(); }
  async function runTest(id: number) {
    setErr(null); setMsg(null);
    try {
      const r = await testAlert(id);
      setMsg(r.fired ? "Condition remplie — email envoyé." : r.triggered ? "Condition remplie (email déjà envoyé)." : `Condition non remplie (valeur actuelle : ${r.value ?? "—"}).`);
      load();
    } catch (e) { setErr(e instanceof Error ? e.message : "Test impossible."); }
  }

  return (
    <div className="rounded-2xl border border-outline-variant bg-surface-container-lowest">
      <div className="flex items-center gap-2 border-b border-outline-variant p-4">
        <NotificationsActiveOutlined style={{ fontSize: 18 }} className="text-on-surface-variant" />
        <p className="text-body-md font-semibold text-on-surface">Alertes par email</p>
      </div>
      <div className="space-y-3 p-4">
        {alerts.length === 0 && <p className="text-body-sm text-on-surface-variant/60">Aucune alerte. Recevez un email quand la valeur franchit un seuil.</p>}
        {alerts.map((a) => (
          <div key={a.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-outline-variant p-3">
            <div className="min-w-0">
              <p className="text-body-sm text-on-surface">Valeur {opLabel(a.operator)} <span className="font-semibold">{a.threshold}</span></p>
              <p className="truncate text-label-md text-on-surface-variant">{a.recipients.join(", ")}{a.last_state ? ` · état : ${a.last_state}${a.last_value != null ? ` (${a.last_value})` : ""}` : ""}</p>
            </div>
            <div className="flex items-center gap-1">
              <button type="button" onClick={() => runTest(a.id)} title="Tester maintenant" className="rounded-lg p-1.5 text-on-surface-variant/60 hover:bg-surface-container hover:text-on-surface"><ScienceOutlined style={{ fontSize: 16 }} /></button>
              <label className="mx-1 inline-flex items-center gap-1 text-label-md text-on-surface-variant">
                <input type="checkbox" checked={a.enabled} onChange={() => toggle(a)} /> actif
              </label>
              <button type="button" onClick={() => remove(a.id)} title="Supprimer" className="rounded-lg p-1.5 text-on-surface-variant/60 hover:bg-error/8 hover:text-error"><DeleteOutlined style={{ fontSize: 16 }} /></button>
            </div>
          </div>
        ))}

        <div className="flex flex-wrap items-end gap-2 border-t border-outline-variant pt-3">
          <div className="flex flex-col gap-1">
            <label className="text-label-md text-on-surface-variant">Condition</label>
            <select className={input} value={op} onChange={(e) => setOp(e.target.value)}>
              {OPS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-label-md text-on-surface-variant">Seuil</label>
            <input type="number" className={`${input} w-28`} value={threshold} onChange={(e) => setThreshold(e.target.value)} placeholder="Ex. 100" />
          </div>
          <div className="flex flex-1 flex-col gap-1">
            <label className="text-label-md text-on-surface-variant">Destinataires (emails séparés par virgule)</label>
            <input className={input} value={recipients} onChange={(e) => setRecipients(e.target.value)} placeholder="a@ex.com, b@ex.com" />
          </div>
          <button type="button" onClick={add} disabled={saving}
            className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-body-sm font-medium text-on-primary transition-colors hover:bg-primary-container disabled:opacity-50">
            <AddOutlined style={{ fontSize: 16 }} /> Ajouter
          </button>
        </div>
        {err && <p className="text-label-md text-error">{err}</p>}
        {msg && <p className="text-label-md text-secondary">{msg}</p>}
      </div>
    </div>
  );
}
