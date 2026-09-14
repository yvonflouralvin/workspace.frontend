"use client";

import { useEffect, useState } from "react";
import { usePermissions } from "@repo/auth/hooks/usePermissions";
import { DashboardShell } from "@/components/DashboardShell";
import {
  listJournaux,
  createJournal,
  chargerJournauxDefaut,
  TYPE_JOURNAL_LABELS,
  type Journal,
  type TypeJournal,
} from "@/lib/compta-api";
import { AddOutlined, DownloadOutlined } from "@mui/icons-material";

const FIELD =
  "rounded-lg border border-outline-soft bg-surface-container-lowest px-2.5 py-1.5 text-body-sm text-on-surface outline-none focus:border-primary transition-colors";

export default function JournauxPage() {
  const { can } = usePermissions();
  const canManage = can("comptabilite.parametrage.manage");

  const [journaux, setJournaux] = useState<Journal[] | null>(null);
  const [ajout, setAjout] = useState(false);
  const [chargement, setChargement] = useState(false);
  const [code, setCode] = useState("");
  const [libelle, setLibelle] = useState("");
  const [type, setType] = useState<TypeJournal>("OD");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function reload() {
    listJournaux().then(setJournaux);
  }

  useEffect(() => {
    reload();
  }, []);

  async function ajouter(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await createJournal({ code: code.trim().toUpperCase(), libelle: libelle.trim(), type_journal: type });
      setCode("");
      setLibelle("");
      setAjout(false);
      reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur inattendue");
    } finally {
      setSaving(false);
    }
  }

  async function defauts() {
    setChargement(true);
    try {
      await chargerJournauxDefaut();
      reload();
    } finally {
      setChargement(false);
    }
  }

  return (
    <DashboardShell>
      <div className="p-4 md:p-8 max-w-[800px] mx-auto space-y-5">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="font-display text-headline-lg text-on-surface">Journaux</h1>
            <p className="text-body-md text-on-surface-variant mt-0.5">
              Achats, ventes, banque, caisse, opérations diverses, à-nouveaux.
            </p>
          </div>
          {canManage && (
            <div className="flex items-center gap-2">
              <button type="button" onClick={defauts} disabled={chargement} className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-lg border border-outline-soft bg-surface-container-lowest text-body-sm font-semibold text-on-surface-variant hover:bg-surface-container-low transition-colors disabled:opacity-50">
                <DownloadOutlined style={{ fontSize: 16 }} />
                {chargement ? "…" : "Journaux par défaut"}
              </button>
              {!ajout && (
                <button type="button" onClick={() => setAjout(true)} className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-lg bg-primary text-on-primary text-body-sm font-semibold shadow-button hover:bg-primary-container transition-colors">
                  <AddOutlined style={{ fontSize: 16 }} />
                  Nouveau journal
                </button>
              )}
            </div>
          )}
        </div>

        {ajout && (
          <form onSubmit={ajouter} className="flex flex-wrap items-end gap-2 rounded-2xl border border-outline-soft bg-surface-container-lowest p-4">
            {error && <p className="text-body-sm text-error w-full">{error}</p>}
            <div>
              <span className="block text-label-sm uppercase text-outline mb-1">Code</span>
              <input value={code} onChange={(e) => setCode(e.target.value)} className={`${FIELD} w-20`} required autoFocus />
            </div>
            <div className="flex-1 min-w-[200px]">
              <span className="block text-label-sm uppercase text-outline mb-1">Libellé</span>
              <input value={libelle} onChange={(e) => setLibelle(e.target.value)} className={`${FIELD} w-full`} required />
            </div>
            <div>
              <span className="block text-label-sm uppercase text-outline mb-1">Type</span>
              <select value={type} onChange={(e) => setType(e.target.value as TypeJournal)} className={FIELD}>
                {Object.entries(TYPE_JOURNAL_LABELS).map(([v, l]) => (
                  <option key={v} value={v}>{l}</option>
                ))}
              </select>
            </div>
            <button type="button" onClick={() => setAjout(false)} className="h-9 px-3.5 rounded-lg border border-outline-soft bg-surface-container-lowest text-body-sm font-semibold text-on-surface-variant hover:bg-surface-container-low transition-colors">
              Annuler
            </button>
            <button type="submit" disabled={saving} className="h-9 px-4 rounded-lg bg-primary text-on-primary text-body-sm font-semibold shadow-button hover:bg-primary-container disabled:opacity-50 transition-colors">
              {saving ? "…" : "Créer"}
            </button>
          </form>
        )}

        {journaux === null ? (
          <p className="text-body-md text-on-surface-variant">Chargement…</p>
        ) : journaux.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-outline-soft p-8 text-center">
            <p className="text-body-md text-on-surface-variant">Aucun journal — chargez les journaux par défaut pour démarrer.</p>
          </div>
        ) : (
          <ul className="rounded-2xl border border-outline-soft bg-surface-container-lowest divide-y divide-hairline">
            {journaux.map((j) => (
              <li key={j.id} className="flex items-center gap-3 px-4 py-3">
                <span className="font-mono text-body-sm font-semibold text-on-surface w-12">{j.code}</span>
                <span className="flex-1 text-body-md text-on-surface">{j.libelle}</span>
                <span className="text-label-md text-outline">{TYPE_JOURNAL_LABELS[j.type_journal]}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </DashboardShell>
  );
}
