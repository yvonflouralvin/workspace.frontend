"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { usePermissions } from "@repo/auth/hooks/usePermissions";
import { RightDrawer } from "@repo/ui/RightDrawer";
import { DashboardShell } from "@/components/DashboardShell";
import { AddOutlined, ArrowBackOutlined, DeleteOutlineOutlined, EditOutlined, ScheduleOutlined } from "@mui/icons-material";
import {
  listSchemasAdministration,
  createSchemaAdministration,
  updateSchemaAdministration,
  deleteSchemaAdministration,
  type SchemaAdministration,
} from "@/app/lib/schemas-admin-api";

const inputCls =
  "rounded-xl border border-outline-variant bg-surface-container-lowest px-3 py-2 text-body-md text-on-surface focus:outline-none focus:border-primary transition-colors";
const labelCls = "text-label-md font-medium text-on-surface-variant";

function Editor({ initial, canManage, onClose, onSaved }: {
  initial?: SchemaAdministration; canManage: boolean; onClose: () => void; onSaved: () => void;
}) {
  const [nom, setNom] = useState(initial?.nom ?? "");
  const [nb, setNb] = useState(initial?.nombre_prises ?? 3);
  const [horaires, setHoraires] = useState<string[]>(initial?.horaires ?? ["08:00", "14:00", "20:00"]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function setNombre(n: number) {
    const clamped = Math.max(1, Math.min(24, n || 1));
    setNb(clamped);
    setHoraires((h) => {
      const next = [...h];
      while (next.length < clamped) next.push("08:00");
      return next.slice(0, clamped);
    });
  }

  async function save() {
    if (!nom.trim()) { setError("Le nom est requis."); return; }
    setSaving(true); setError(null);
    try {
      if (initial) await updateSchemaAdministration(initial.id, { nom: nom.trim(), nombre_prises: nb, horaires });
      else await createSchemaAdministration({ nom: nom.trim(), nombre_prises: nb, horaires });
      onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur.");
    } finally { setSaving(false); }
  }

  return (
    <RightDrawer title={initial ? "Modifier le schéma" : "Nouveau schéma"} onClose={onClose} width="w-[440px] max-w-full">
      <div className="h-full flex flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto pr-1 space-y-4">
          <div className="flex flex-col gap-1">
            <label className={labelCls}>Nom</label>
            <input className={inputCls} value={nom} onChange={(e) => setNom(e.target.value)} placeholder="Ex : 3 prises, Matin/Soir…" autoFocus disabled={!canManage} />
          </div>
          <div className="flex flex-col gap-1">
            <label className={labelCls}>Nombre de prises</label>
            <input type="number" min={1} max={24} className={`${inputCls} w-28`} value={nb}
              onChange={(e) => setNombre(Number(e.target.value))} disabled={!canManage} />
          </div>
          <div className="flex flex-col gap-1">
            <label className={labelCls}>Horaires</label>
            <div className="flex flex-wrap gap-2">
              {horaires.map((h, i) => (
                <input key={i} type="time" className={inputCls} value={h} disabled={!canManage}
                  onChange={(e) => setHoraires((prev) => prev.map((x, j) => (j === i ? e.target.value : x)))} />
              ))}
            </div>
          </div>
          {error && <p className="text-body-sm text-error bg-error-container/40 rounded-xl px-4 py-3">{error}</p>}
        </div>
        {canManage && (
          <div className="shrink-0 flex gap-3 pt-4 border-t border-outline-variant">
            <button type="button" onClick={save} disabled={saving}
              className="flex-1 py-2 rounded-xl bg-primary text-on-primary text-body-md font-medium hover:bg-primary-container transition-colors disabled:opacity-50">
              {saving ? "Enregistrement…" : "Enregistrer"}
            </button>
            <button type="button" onClick={onClose} disabled={saving}
              className="px-5 py-2 rounded-xl text-body-md text-on-surface-variant border border-outline-variant hover:bg-surface-container transition-colors disabled:opacity-50">
              Annuler
            </button>
          </div>
        )}
      </div>
    </RightDrawer>
  );
}

export default function PrescriptionsSchemasPage() {
  const { can } = usePermissions();
  const canView = can("hosto.emr.view");
  const canManage = can("hosto.settings.manage");

  const [items, setItems] = useState<SchemaAdministration[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<SchemaAdministration | null>(null);
  const [creating, setCreating] = useState(false);

  const load = useCallback(() => {
    if (!canView) { setLoading(false); return; }
    listSchemasAdministration().then(setItems).catch(() => {}).finally(() => setLoading(false));
  }, [canView]);

  useEffect(() => { load(); }, [load]);

  async function remove(id: number) {
    try { await deleteSchemaAdministration(id); load(); }
    catch (e) { alert(e instanceof Error ? e.message : "Suppression impossible."); }
  }

  return (
    <DashboardShell>
      <div className="p-8 max-w-3xl mx-auto space-y-6">
        <Link href="/parametres" className="inline-flex items-center gap-1.5 text-body-sm text-on-surface-variant hover:text-on-surface transition-colors">
          <ArrowBackOutlined style={{ fontSize: 16 }} /> Retour aux paramètres
        </Link>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-headline-md font-display text-on-surface">Schémas d&apos;administration</h1>
            <p className="text-body-sm text-on-surface-variant mt-1">
              Horaires de prise proposés à la prescription (suivi dose par dose).
            </p>
          </div>
          {canManage && (
            <button type="button" onClick={() => setCreating(true)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-on-primary text-body-md font-medium hover:bg-primary-container transition-colors">
              <AddOutlined style={{ fontSize: 18 }} /> Nouveau schéma
            </button>
          )}
        </div>

        {loading ? (
          <div className="space-y-2">{[1, 2, 3].map((i) => <div key={i} className="h-16 rounded-2xl bg-surface-container animate-pulse" />)}</div>
        ) : (
          <div className="rounded-2xl border border-outline-variant bg-surface-container-lowest divide-y divide-outline-variant overflow-hidden">
            {items.map((s) => (
              <div key={s.id} className="flex items-center gap-4 px-5 py-3.5">
                <ScheduleOutlined style={{ fontSize: 18 }} className="text-on-surface-variant" />
                <div className="flex-1 min-w-0">
                  <p className="text-body-md font-medium text-on-surface">
                    {s.nom}
                    {s.is_default && <span className="ml-2 text-label-sm text-primary bg-primary/8 px-2 py-0.5 rounded-full">défaut</span>}
                  </p>
                  <p className="text-body-sm text-on-surface-variant">{s.horaires.join(" · ")}</p>
                </div>
                <button type="button" onClick={() => setEditing(s)}
                  className="p-1.5 rounded-lg text-on-surface-variant hover:text-primary hover:bg-primary/8 transition-colors" title={canManage ? "Modifier" : "Voir"}>
                  <EditOutlined style={{ fontSize: 17 }} />
                </button>
                {canManage && (
                  <button type="button" onClick={() => remove(s.id)} title="Supprimer"
                    className="p-1.5 rounded-lg text-on-surface-variant hover:text-error hover:bg-error/8 transition-colors">
                    <DeleteOutlineOutlined style={{ fontSize: 17 }} />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {(creating || editing) && (
        <Editor initial={editing ?? undefined} canManage={canManage}
          onClose={() => { setCreating(false); setEditing(null); }}
          onSaved={() => { setCreating(false); setEditing(null); load(); }} />
      )}
    </DashboardShell>
  );
}
