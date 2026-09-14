"use client";

import { useEffect, useState } from "react";
import {
  listControles,
  createControle,
  changerStatutControle,
  deleteControle,
  historiqueControle,
  STATUT_CONTROLE_LABELS,
  type Controle,
  type StatutControle,
  type ControleHistoriqueEntry,
  type WorkspaceMember,
} from "@/lib/audit-api";
import {
  AddOutlined,
  DeleteOutlined,
  ExpandMoreOutlined,
  CheckCircleOutlined,
} from "@mui/icons-material";

const FIELD =
  "rounded-lg border border-outline-soft bg-surface-container-lowest px-2.5 py-1.5 text-body-sm text-on-surface outline-none focus:border-primary transition-colors";

const STATUT_TONE: Record<StatutControle, string> = {
  A_FAIRE: "bg-surface-container text-on-surface-variant",
  EN_COURS: "bg-role-admin-container text-role-admin",
  TERMINE: "bg-member-active-container text-member-active",
  A_REVOIR: "bg-error-container text-error",
  VALIDE: "bg-role-owner-container text-role-owner",
};

export function ChecklistPanel({
  missionId,
  canManage,
  members,
  onToast,
}: {
  missionId: number;
  canManage: boolean;
  members: WorkspaceMember[];
  onToast: (message: string) => void;
}) {
  const [controles, setControles] = useState<Controle[] | null>(null);
  const [expanded, setExpanded] = useState<number | null>(null);
  const [historique, setHistorique] = useState<Record<number, ControleHistoriqueEntry[]>>({});
  const [ajout, setAjout] = useState(false);
  const [libelle, setLibelle] = useState("");
  const [assigne, setAssigne] = useState("");
  const [saving, setSaving] = useState(false);

  function reload() {
    listControles(missionId).then(setControles);
  }

  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [missionId]);

  async function ajouterControle(e: React.FormEvent) {
    e.preventDefault();
    if (!libelle.trim()) return;
    setSaving(true);
    try {
      await createControle(missionId, {
        libelle: libelle.trim(),
        assigne_user_id: assigne ? Number(assigne) : undefined,
      });
      setLibelle("");
      setAssigne("");
      setAjout(false);
      reload();
      onToast("Contrôle ajouté.");
    } catch {
      onToast("Erreur lors de l'ajout du contrôle.");
    } finally {
      setSaving(false);
    }
  }

  async function changerStatut(c: Controle, statut: StatutControle) {
    try {
      const updated = await changerStatutControle(missionId, c.id, statut);
      setControles((cs) => (cs ?? []).map((x) => (x.id === c.id ? updated : x)));
    } catch {
      onToast("Erreur lors du changement de statut.");
    }
  }

  async function supprimer(c: Controle) {
    try {
      await deleteControle(missionId, c.id);
      setControles((cs) => (cs ?? []).filter((x) => x.id !== c.id));
    } catch {
      onToast("Erreur lors de la suppression.");
    }
  }

  async function toggleHistorique(c: Controle) {
    if (expanded === c.id) {
      setExpanded(null);
      return;
    }
    setExpanded(c.id);
    if (!historique[c.id]) {
      const h = await historiqueControle(missionId, c.id);
      setHistorique((prev) => ({ ...prev, [c.id]: h }));
    }
  }

  if (controles === null) {
    return <p className="text-body-md text-on-surface-variant">Chargement…</p>;
  }

  const total = controles.length;
  const valides = controles.filter((c) => c.statut === "VALIDE").length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-label-md text-outline">
          {total > 0 ? `${valides}/${total} validés` : "Aucun point de contrôle."}
        </p>
        {canManage && !ajout && (
          <button
            type="button"
            onClick={() => setAjout(true)}
            className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-lg bg-primary text-on-primary text-body-sm font-semibold shadow-button hover:bg-primary-container transition-colors"
          >
            <AddOutlined style={{ fontSize: 16 }} />
            Ajouter un point de contrôle
          </button>
        )}
      </div>

      {ajout && (
        <form
          onSubmit={ajouterControle}
          className="flex flex-wrap items-end gap-2 rounded-2xl border border-outline-soft bg-surface-container-lowest p-4"
        >
          <div className="flex-1 min-w-[200px]">
            <span className="block text-label-sm uppercase text-outline mb-1">Libellé</span>
            <input
              type="text"
              value={libelle}
              onChange={(e) => setLibelle(e.target.value)}
              className={`${FIELD} w-full`}
              autoFocus
              required
            />
          </div>
          <div>
            <span className="block text-label-sm uppercase text-outline mb-1">Assigné à</span>
            <select value={assigne} onChange={(e) => setAssigne(e.target.value)} className={FIELD}>
              <option value="">—</option>
              {members.map((m) => (
                <option key={m.user.id} value={m.user.id}>
                  {m.user.username || m.user.email}
                </option>
              ))}
            </select>
          </div>
          <button
            type="button"
            onClick={() => setAjout(false)}
            className="h-9 px-3.5 rounded-lg border border-outline-soft bg-surface-container-lowest text-body-sm font-semibold text-on-surface-variant hover:bg-surface-container-low transition-colors"
          >
            Annuler
          </button>
          <button
            type="submit"
            disabled={saving}
            className="h-9 px-4 rounded-lg bg-primary text-on-primary text-body-sm font-semibold shadow-button hover:bg-primary-container disabled:opacity-50 transition-colors"
          >
            {saving ? "…" : "Ajouter"}
          </button>
        </form>
      )}

      {controles.length > 0 && (
        <ul className="rounded-2xl border border-outline-soft bg-surface-container-lowest divide-y divide-hairline">
          {controles.map((c) => (
            <li key={c.id}>
              <div className="flex items-center gap-2 px-4 py-3">
                <button
                  type="button"
                  onClick={() => toggleHistorique(c)}
                  className="flex flex-1 items-center gap-2 min-w-0 text-left"
                >
                  <ExpandMoreOutlined
                    style={{ fontSize: 18 }}
                    className={`shrink-0 text-outline transition-transform ${expanded === c.id ? "rotate-180" : ""}`}
                  />
                  {c.statut === "VALIDE" && (
                    <CheckCircleOutlined style={{ fontSize: 16 }} className="text-member-active shrink-0" />
                  )}
                  <span className="text-body-md text-on-surface truncate">{c.libelle}</span>
                  {c.assigne_nom && (
                    <span className="text-label-md text-outline shrink-0">{c.assigne_nom}</span>
                  )}
                </button>
                {canManage ? (
                  <select
                    value={c.statut}
                    onChange={(e) => changerStatut(c, e.target.value as StatutControle)}
                    className={`${FIELD} shrink-0 ${STATUT_TONE[c.statut]} border-none`}
                  >
                    {Object.entries(STATUT_CONTROLE_LABELS).map(([value, label]) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </select>
                ) : (
                  <span className={`rounded-md px-2 py-1 text-[11px] font-semibold shrink-0 ${STATUT_TONE[c.statut]}`}>
                    {STATUT_CONTROLE_LABELS[c.statut]}
                  </span>
                )}
                {canManage && (
                  <button
                    type="button"
                    onClick={() => supprimer(c)}
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-error hover:bg-error-container transition-colors"
                    aria-label="Supprimer"
                  >
                    <DeleteOutlined style={{ fontSize: 15 }} />
                  </button>
                )}
              </div>
              {expanded === c.id && (
                <div className="px-4 pb-3 pl-11 space-y-1.5">
                  {c.commentaire && (
                    <p className="text-body-sm text-on-surface-variant">{c.commentaire}</p>
                  )}
                  {(historique[c.id]?.length ?? 0) === 0 && (
                    <p className="text-label-md text-outline">Aucun historique.</p>
                  )}
                  {(historique[c.id] ?? []).map((h) => (
                    <p key={h.id} className="text-label-md text-outline">
                      {STATUT_CONTROLE_LABELS[h.statut_apres as StatutControle] ?? h.statut_apres}
                      {" — "}
                      {h.par_nom ?? "quelqu'un"}
                      {" · "}
                      {new Date(h.survenu_le).toLocaleString("fr-FR")}
                      {h.commentaire ? ` · ${h.commentaire}` : ""}
                    </p>
                  ))}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
