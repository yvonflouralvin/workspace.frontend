"use client";

import { useEffect, useState } from "react";
import {
  listAnomalies,
  createAnomalie,
  updateAnomalie,
  STATUT_ANOMALIE_LABELS,
  type Anomalie,
  type StatutAnomalie,
} from "@/lib/audit-api";
import { AddOutlined, WarningAmberOutlined, ExpandMoreOutlined } from "@mui/icons-material";

const FIELD =
  "w-full rounded-lg border border-outline-soft bg-surface-container-lowest px-3 py-2 text-body-md text-on-surface outline-none focus:border-primary transition-colors";
const LABEL = "block text-label-sm uppercase text-outline mb-1.5";

const STATUT_TONE: Record<StatutAnomalie, string> = {
  IDENTIFIEE: "bg-error-container text-error",
  EN_TRAITEMENT: "bg-role-admin-container text-role-admin",
  RESOLUE: "bg-member-active-container text-member-active",
};

export function AnomaliesPanel({
  missionId,
  canManage,
  onToast,
}: {
  missionId: number;
  canManage: boolean;
  onToast: (message: string) => void;
}) {
  const [anomalies, setAnomalies] = useState<Anomalie[] | null>(null);
  const [expanded, setExpanded] = useState<number | null>(null);
  const [ajout, setAjout] = useState(false);
  const [titre, setTitre] = useState("");
  const [description, setDescription] = useState("");
  const [recommandation, setRecommandation] = useState("");
  const [saving, setSaving] = useState(false);

  function reload() {
    listAnomalies(missionId).then(setAnomalies);
  }

  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [missionId]);

  async function ajouter(e: React.FormEvent) {
    e.preventDefault();
    if (!titre.trim()) return;
    setSaving(true);
    try {
      await createAnomalie(missionId, {
        titre: titre.trim(),
        description: description || undefined,
        recommandation: recommandation || undefined,
      });
      setTitre("");
      setDescription("");
      setRecommandation("");
      setAjout(false);
      reload();
      onToast("Anomalie enregistrée.");
    } catch {
      onToast("Erreur lors de l'enregistrement.");
    } finally {
      setSaving(false);
    }
  }

  async function changerStatut(a: Anomalie, statut: StatutAnomalie) {
    try {
      const updated = await updateAnomalie(missionId, a.id, { statut });
      setAnomalies((as) => (as ?? []).map((x) => (x.id === a.id ? updated : x)));
    } catch {
      onToast("Erreur lors du changement de statut.");
    }
  }

  if (anomalies === null) {
    return <p className="text-body-md text-on-surface-variant">Chargement…</p>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-label-md text-outline">
          {anomalies.length} anomalie{anomalies.length > 1 ? "s" : ""}
        </p>
        {canManage && !ajout && (
          <button
            type="button"
            onClick={() => setAjout(true)}
            className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-lg bg-primary text-on-primary text-body-sm font-semibold shadow-button hover:bg-primary-container transition-colors"
          >
            <AddOutlined style={{ fontSize: 16 }} />
            Signaler une anomalie
          </button>
        )}
      </div>

      {ajout && (
        <form onSubmit={ajouter} className="space-y-3 rounded-2xl border border-outline-soft bg-surface-container-lowest p-4">
          <div>
            <span className={LABEL}>Titre</span>
            <input type="text" value={titre} onChange={(e) => setTitre(e.target.value)} className={FIELD} autoFocus required />
          </div>
          <div>
            <span className={LABEL}>Description</span>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} className={`${FIELD} resize-none`} />
          </div>
          <div>
            <span className={LABEL}>Recommandation</span>
            <textarea value={recommandation} onChange={(e) => setRecommandation(e.target.value)} rows={2} className={`${FIELD} resize-none`} />
          </div>
          <div className="flex items-center justify-end gap-2.5">
            <button type="button" onClick={() => setAjout(false)} className="h-9 px-3.5 rounded-lg border border-outline-soft bg-surface-container-lowest text-body-sm font-semibold text-on-surface-variant hover:bg-surface-container-low transition-colors">
              Annuler
            </button>
            <button type="submit" disabled={saving} className="h-9 px-4 rounded-lg bg-primary text-on-primary text-body-sm font-semibold shadow-button hover:bg-primary-container disabled:opacity-50 transition-colors">
              {saving ? "…" : "Enregistrer"}
            </button>
          </div>
        </form>
      )}

      {anomalies.length === 0 && !ajout && (
        <div className="rounded-2xl border border-dashed border-outline-soft p-8 text-center">
          <WarningAmberOutlined style={{ fontSize: 28 }} className="text-outline mx-auto" />
          <p className="text-body-md text-on-surface-variant mt-2">Aucune anomalie identifiée.</p>
        </div>
      )}

      {anomalies.length > 0 && (
        <ul className="rounded-2xl border border-outline-soft bg-surface-container-lowest divide-y divide-hairline">
          {anomalies.map((a) => (
            <li key={a.id}>
              <div className="flex items-center gap-2 px-4 py-3">
                <button
                  type="button"
                  onClick={() => setExpanded(expanded === a.id ? null : a.id)}
                  className="flex flex-1 items-center gap-2 min-w-0 text-left"
                >
                  <ExpandMoreOutlined
                    style={{ fontSize: 18 }}
                    className={`shrink-0 text-outline transition-transform ${expanded === a.id ? "rotate-180" : ""}`}
                  />
                  <span className="text-body-md text-on-surface truncate">{a.titre}</span>
                </button>
                {canManage ? (
                  <select
                    value={a.statut}
                    onChange={(e) => changerStatut(a, e.target.value as StatutAnomalie)}
                    className={`rounded-lg border-none px-2.5 py-1.5 text-body-sm shrink-0 ${STATUT_TONE[a.statut]}`}
                  >
                    {Object.entries(STATUT_ANOMALIE_LABELS).map(([value, label]) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </select>
                ) : (
                  <span className={`rounded-md px-2 py-1 text-[11px] font-semibold shrink-0 ${STATUT_TONE[a.statut]}`}>
                    {STATUT_ANOMALIE_LABELS[a.statut]}
                  </span>
                )}
              </div>
              {expanded === a.id && (
                <div className="px-4 pb-3 pl-11 space-y-1.5">
                  {a.description && <p className="text-body-sm text-on-surface-variant">{a.description}</p>}
                  {a.recommandation && (
                    <p className="text-body-sm text-on-surface-variant">
                      <span className="font-semibold text-on-surface">Recommandation : </span>
                      {a.recommandation}
                    </p>
                  )}
                  {a.actions_correctives && (
                    <p className="text-body-sm text-on-surface-variant">
                      <span className="font-semibold text-on-surface">Actions correctives : </span>
                      {a.actions_correctives}
                    </p>
                  )}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
