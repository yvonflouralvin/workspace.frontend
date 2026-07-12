"use client";

import { useCallback, useEffect, useState } from "react";
import { AddOutlined, DeleteOutlined, ScheduleSendOutlined, SendOutlined } from "@mui/icons-material";
import { createScheduledReport, deleteScheduledReport, getScheduledReports, runScheduledReport, updateScheduledReport, type ScheduledReport } from "@/lib/dashboard-api";

const FREQ = [
  { value: "daily", label: "Quotidien" },
  { value: "weekly", label: "Hebdomadaire" },
  { value: "monthly", label: "Mensuel" },
];
const freqLabel = (f: string) => FREQ.find((x) => x.value === f)?.label ?? f;
const input = "rounded-xl border border-outline-variant bg-surface-container-lowest px-3 py-2 text-body-sm text-on-surface focus:border-primary focus:outline-none";

export function ScheduledReportsPanel({ widgetId }: { widgetId: number }) {
  const [reports, setReports] = useState<ScheduledReport[]>([]);
  const [freq, setFreq] = useState("weekly");
  const [recipients, setRecipients] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const load = useCallback(() => { getScheduledReports(widgetId).then((r) => setReports(r.reports)).catch(() => {}); }, [widgetId]);
  useEffect(() => { load(); }, [load]);

  async function add() {
    setErr(null); setMsg(null);
    const recs = recipients.split(",").map((r) => r.trim()).filter(Boolean);
    if (!recs.length) { setErr("Au moins un email destinataire."); return; }
    try { await createScheduledReport({ widget_id: widgetId, frequency: freq, recipients: recs, enabled: true }); setRecipients(""); load(); }
    catch (e) { setErr(e instanceof Error ? e.message : "Erreur."); }
  }
  async function toggle(r: ScheduledReport) {
    await updateScheduledReport(r.id, { widget_id: r.widget_id, frequency: r.frequency, recipients: r.recipients, enabled: !r.enabled }).catch(() => {});
    load();
  }
  async function remove(id: number) { await deleteScheduledReport(id).catch(() => {}); load(); }
  async function runNow(id: number) {
    setErr(null); setMsg(null);
    try { const r = await runScheduledReport(id); setMsg(r.sent ? "Envoyé — CSV en pièce jointe." : `Échec : ${r.error ?? "inconnu"}`); load(); }
    catch (e) { setErr(e instanceof Error ? e.message : "Envoi impossible."); }
  }

  return (
    <div className="rounded-2xl border border-outline-variant bg-surface-container-lowest">
      <div className="flex items-center gap-2 border-b border-outline-variant p-4">
        <ScheduleSendOutlined style={{ fontSize: 18 }} className="text-on-surface-variant" />
        <p className="text-body-md font-semibold text-on-surface">Envoi programmé (CSV par email)</p>
      </div>
      <div className="space-y-3 p-4">
        {reports.length === 0 && <p className="text-body-sm text-on-surface-variant/60">Aucun envoi programmé.</p>}
        {reports.map((r) => (
          <div key={r.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-outline-variant p-3">
            <div className="min-w-0">
              <p className="text-body-sm text-on-surface">{freqLabel(r.frequency)}</p>
              <p className="truncate text-label-md text-on-surface-variant">{r.recipients.join(", ")}{r.last_sent_at ? ` · dernier envoi : ${new Date(r.last_sent_at).toLocaleString("fr-FR")}` : ""}</p>
            </div>
            <div className="flex items-center gap-1">
              <button type="button" onClick={() => runNow(r.id)} title="Envoyer maintenant" className="rounded-lg p-1.5 text-on-surface-variant/60 hover:bg-surface-container hover:text-primary"><SendOutlined style={{ fontSize: 16 }} /></button>
              <label className="mx-1 inline-flex items-center gap-1 text-label-md text-on-surface-variant"><input type="checkbox" checked={r.enabled} onChange={() => toggle(r)} /> actif</label>
              <button type="button" onClick={() => remove(r.id)} title="Supprimer" className="rounded-lg p-1.5 text-on-surface-variant/60 hover:bg-error/8 hover:text-error"><DeleteOutlined style={{ fontSize: 16 }} /></button>
            </div>
          </div>
        ))}
        <div className="flex flex-wrap items-end gap-2 border-t border-outline-variant pt-3">
          <div className="flex flex-col gap-1">
            <label className="text-label-md text-on-surface-variant">Fréquence</label>
            <select className={input} value={freq} onChange={(e) => setFreq(e.target.value)}>{FREQ.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}</select>
          </div>
          <div className="flex flex-1 flex-col gap-1">
            <label className="text-label-md text-on-surface-variant">Destinataires (emails séparés par virgule)</label>
            <input className={input} value={recipients} onChange={(e) => setRecipients(e.target.value)} placeholder="a@ex.com, b@ex.com" />
          </div>
          <button type="button" onClick={add} className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-body-sm font-medium text-on-primary hover:bg-primary-container"><AddOutlined style={{ fontSize: 16 }} /> Programmer</button>
        </div>
        {err && <p className="text-label-md text-error">{err}</p>}
        {msg && <p className="text-label-md text-secondary">{msg}</p>}
      </div>
    </div>
  );
}
