"use client";

import { useEffect, useState } from "react";
import { usePermissions } from "@repo/auth/hooks/usePermissions";
import { ConfirmDialog } from "@repo/ui/ConfirmDialog";
import { DashboardShell } from "@/components/DashboardShell";
import { listExercices, createExercice, cloturerExercice, type Exercice } from "@/lib/compta-api";
import { AddOutlined, LockOutlined } from "@mui/icons-material";

const FIELD =
  "rounded-lg border border-outline-soft bg-surface-container-lowest px-2.5 py-1.5 text-body-sm text-on-surface outline-none focus:border-primary transition-colors";

export default function ExercicesPage() {
  const { can } = usePermissions();
  const canManage = can("comptabilite.parametrage.manage");

  const [exercices, setExercices] = useState<Exercice[] | null>(null);
  const [ajout, setAjout] = useState(false);
  const [libelle, setLibelle] = useState("");
  const [debut, setDebut] = useState("");
  const [fin, setFin] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [aCloturer, setACloturer] = useState<Exercice | null>(null);
  const [cloturant, setCloturant] = useState(false);

  function reload() {
    listExercices().then(setExercices);
  }

  useEffect(() => {
    reload();
  }, []);

  async function ajouter(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await createExercice({ libelle: libelle.trim(), date_debut: debut, date_fin: fin });
      setLibelle("");
      setDebut("");
      setFin("");
      setAjout(false);
      reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur inattendue");
    } finally {
      setSaving(false);
    }
  }

  async function confirmerCloture() {
    if (!aCloturer) return;
    setCloturant(true);
    try {
      await cloturerExercice(aCloturer.id);
      reload();
    } finally {
      setCloturant(false);
      setACloturer(null);
    }
  }

  return (
    <DashboardShell>
      <div className="p-4 md:p-8 max-w-[800px] mx-auto space-y-5">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="font-display text-headline-lg text-on-surface">Exercices comptables</h1>
            <p className="text-body-md text-on-surface-variant mt-0.5">
              Une écriture ne peut être saisie que dans un exercice ouvert.
            </p>
          </div>
          {canManage && !ajout && (
            <button type="button" onClick={() => setAjout(true)} className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-lg bg-primary text-on-primary text-body-sm font-semibold shadow-button hover:bg-primary-container transition-colors">
              <AddOutlined style={{ fontSize: 16 }} />
              Nouvel exercice
            </button>
          )}
        </div>

        {ajout && (
          <form onSubmit={ajouter} className="flex flex-wrap items-end gap-2 rounded-2xl border border-outline-soft bg-surface-container-lowest p-4">
            {error && <p className="text-body-sm text-error w-full">{error}</p>}
            <div className="flex-1 min-w-[160px]">
              <span className="block text-label-sm uppercase text-outline mb-1">Libellé</span>
              <input value={libelle} onChange={(e) => setLibelle(e.target.value)} className={`${FIELD} w-full`} placeholder="Ex. 2026" required autoFocus />
            </div>
            <div>
              <span className="block text-label-sm uppercase text-outline mb-1">Début</span>
              <input type="date" value={debut} onChange={(e) => setDebut(e.target.value)} className={FIELD} required />
            </div>
            <div>
              <span className="block text-label-sm uppercase text-outline mb-1">Fin</span>
              <input type="date" value={fin} onChange={(e) => setFin(e.target.value)} className={FIELD} required />
            </div>
            <button type="button" onClick={() => setAjout(false)} className="h-9 px-3.5 rounded-lg border border-outline-soft bg-surface-container-lowest text-body-sm font-semibold text-on-surface-variant hover:bg-surface-container-low transition-colors">
              Annuler
            </button>
            <button type="submit" disabled={saving} className="h-9 px-4 rounded-lg bg-primary text-on-primary text-body-sm font-semibold shadow-button hover:bg-primary-container disabled:opacity-50 transition-colors">
              {saving ? "…" : "Créer"}
            </button>
          </form>
        )}

        {exercices === null ? (
          <p className="text-body-md text-on-surface-variant">Chargement…</p>
        ) : exercices.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-outline-soft p-8 text-center">
            <p className="text-body-md text-on-surface-variant">Aucun exercice — créez le premier pour commencer à saisir.</p>
          </div>
        ) : (
          <ul className="rounded-2xl border border-outline-soft bg-surface-container-lowest divide-y divide-hairline">
            {exercices.map((ex) => (
              <li key={ex.id} className="flex items-center gap-3 px-4 py-3">
                <div className="flex-1 min-w-0">
                  <p className="text-body-md font-medium text-on-surface">{ex.libelle}</p>
                  <p className="text-label-md text-outline">{ex.date_debut} → {ex.date_fin}</p>
                </div>
                <span className={`rounded-md px-2 py-0.5 text-[11px] font-semibold ${ex.statut === "OUVERT" ? "bg-member-active-container text-member-active" : "bg-surface-container text-on-surface-variant"}`}>
                  {ex.statut === "OUVERT" ? "Ouvert" : "Clôturé"}
                </span>
                {canManage && ex.statut === "OUVERT" && (
                  <button
                    type="button"
                    onClick={() => setACloturer(ex)}
                    className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg text-body-sm font-semibold text-error hover:bg-error-container transition-colors"
                  >
                    <LockOutlined style={{ fontSize: 15 }} />
                    Clôturer
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}

        {aCloturer && (
          <ConfirmDialog
            title={`Clôturer « ${aCloturer.libelle} » ?`}
            message="Irréversible depuis cet écran : plus aucune écriture ne pourra être saisie ou validée sur cet exercice."
            confirmLabel="Clôturer"
            busy={cloturant}
            onConfirm={confirmerCloture}
            onCancel={() => setACloturer(null)}
          />
        )}
      </div>
    </DashboardShell>
  );
}
