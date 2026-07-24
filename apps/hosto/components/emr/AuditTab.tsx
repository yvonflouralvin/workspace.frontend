"use client";

import { useCallback, useEffect, useState } from "react";
import {
  HistoryOutlined,
  NavigateBeforeOutlined,
  NavigateNextOutlined,
} from "@mui/icons-material";
import { RightDrawer } from "@repo/ui/RightDrawer";
import { getPatientAudit, type AuditLogEntry, type AuditLogPage } from "@/app/lib/audit-api";
import { fmtDateTime } from "@/components/actes/shared";

const ACTION_LABEL: Record<string, string> = {
  CREATE: "Création",
  UPDATE: "Modification",
  DELETE: "Suppression",
  VIEW: "Consultation",
  SIGN: "Signature",
  CANCEL: "Annulation",
  PERFORM: "Réalisation",
  VALIDATE: "Validation",
  COLLECT: "Prélèvement",
  ADMIT: "Admission",
  DISCHARGE: "Sortie",
  TRANSFER: "Transfert",
  MAR_ADMINISTER: "Dose administrée",
  MAR_OMIT: "Dose omise",
  MAR_REFUSE: "Dose refusée",
};

const ACTION_CLS: Record<string, string> = {
  CREATE: "bg-secondary/10 text-secondary",
  UPDATE: "bg-tertiary/10 text-tertiary",
  DELETE: "bg-error-container text-error",
  CANCEL: "bg-error-container text-error",
  VIEW: "bg-surface-container text-on-surface-variant",
  SIGN: "bg-primary/10 text-primary",
  ADMIT: "bg-tertiary/10 text-tertiary",
  DISCHARGE: "bg-tertiary/10 text-tertiary",
  TRANSFER: "bg-tertiary/10 text-tertiary",
};

const ENTITY_LABEL: Record<string, string> = {
  patient: "Patient",
  encounter: "Consultation",
  clinical_note: "Note clinique",
  allergy: "Allergie",
  condition: "Problème",
  medical_history: "Antécédent",
  observation: "Constante",
  medication_statement: "Traitement",
  prescription: "Prescription",
  acte: "Acte",
  acte_prescrit: "Acte",
  sejour: "Séjour",
  dose: "Dose",
  lit: "Lit",
  chambre: "Chambre",
  lab_request: "Demande d'examen",
  lab_result: "Résultat d'examen",
  visite: "Visite",
  compte_rendu: "Compte rendu",
};

const PER_PAGE = 20;

function actionLabel(a: string): string {
  return ACTION_LABEL[a] ?? a;
}
function actionCls(a: string): string {
  return ACTION_CLS[a] ?? "bg-surface-container text-on-surface-variant";
}
function entityLabel(e: string): string {
  return ENTITY_LABEL[e] ?? e.replace(/_/g, " ");
}
function userLabel(entry: AuditLogEntry): string {
  return entry.user_name?.trim() || `Utilisateur #${entry.user_id}`;
}
function fmtVal(value: unknown): string {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

function ActionBadge({ action }: { action: string }) {
  return (
    <span className={`inline-flex items-center text-label-sm px-2 py-0.5 rounded-full font-medium ${actionCls(action)}`}>
      {actionLabel(action)}
    </span>
  );
}

export function AuditTab({ patientId }: { patientId: number }) {
  const [data, setData] = useState<AuditLogPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [userFilter, setUserFilter] = useState<number | null>(null);
  const [selected, setSelected] = useState<AuditLogEntry | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    getPatientAudit(patientId, page, PER_PAGE, userFilter)
      .then(setData)
      .catch(() => setError("Impossible de charger l'historique."))
      .finally(() => setLoading(false));
  }, [patientId, page, userFilter]);

  useEffect(() => {
    load();
  }, [load]);

  const items = data?.items ?? [];
  const pageCount = data?.pages ?? 1;

  return (
    <div className="space-y-3">
      {error && (
        <p className="text-body-sm text-error bg-error-container/40 rounded-xl px-4 py-3">{error}</p>
      )}

      {(data?.actors?.length ?? 0) > 0 && (
        <div className="flex items-center gap-2">
          <label className="text-body-sm text-on-surface-variant">Utilisateur :</label>
          <select
            value={userFilter ?? ""}
            onChange={(e) => {
              setUserFilter(e.target.value ? Number(e.target.value) : null);
              setPage(1);
            }}
            className="rounded-xl border border-outline-variant bg-surface-container-lowest px-3 py-1.5 text-body-sm text-on-surface focus:outline-none focus:border-primary transition-colors"
          >
            <option value="">Tous les utilisateurs</option>
            {data?.actors.map((a) => (
              <option key={a.id} value={a.id}>{a.name}</option>
            ))}
          </select>
        </div>
      )}

      {loading && !data ? (
        <div className="rounded-2xl border border-outline-variant bg-surface-container-lowest divide-y divide-outline-variant" aria-busy>
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="px-4 py-3.5">
              <div className="h-4 w-64 rounded bg-surface-container animate-pulse" />
            </div>
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-2xl border border-outline-variant bg-surface-container-lowest p-10 flex flex-col items-center gap-2 text-center">
          <HistoryOutlined style={{ fontSize: 28 }} className="text-on-surface-variant/30" />
          <p className="text-body-md text-on-surface-variant">Aucune activité enregistrée pour ce patient.</p>
        </div>
      ) : (
        <div className="rounded-2xl border border-outline-variant bg-surface-container-lowest overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-outline-variant text-label-md text-on-surface-variant">
                <th className="px-4 py-3 font-medium whitespace-nowrap">Date</th>
                <th className="px-4 py-3 font-medium">Action</th>
                <th className="px-4 py-3 font-medium">Utilisateur</th>
              </tr>
            </thead>
            <tbody>
              {items.map((entry) => (
                <tr
                  key={entry.id}
                  onClick={() => setSelected(entry)}
                  className="border-b border-outline-variant last:border-0 cursor-pointer hover:bg-surface-container-low/60 transition-colors"
                >
                  <td className="px-4 py-3 text-body-sm text-on-surface-variant whitespace-nowrap align-top">
                    {fmtDateTime(entry.created_at)}
                  </td>
                  <td className="px-4 py-3 align-top">
                    <ActionBadge action={entry.action} />
                    <span className="block text-label-sm text-on-surface-variant mt-0.5">
                      {entityLabel(entry.entity_type)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-body-sm text-on-surface align-top">{userLabel(entry)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {pageCount > 1 && (
            <div className="flex items-center justify-between gap-3 px-4 py-3 border-t border-outline-variant">
              <p className="text-body-sm text-on-surface-variant">
                Page {data?.page ?? page} / {pageCount} · {data?.total ?? 0} entrée(s)
              </p>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={(data?.page ?? page) <= 1}
                  className="inline-flex items-center justify-center h-8 w-8 rounded-lg border border-outline-variant text-on-surface-variant hover:bg-surface-container disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  aria-label="Page précédente"
                >
                  <NavigateBeforeOutlined style={{ fontSize: 18 }} />
                </button>
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
                  disabled={(data?.page ?? page) >= pageCount}
                  className="inline-flex items-center justify-center h-8 w-8 rounded-lg border border-outline-variant text-on-surface-variant hover:bg-surface-container disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  aria-label="Page suivante"
                >
                  <NavigateNextOutlined style={{ fontSize: 18 }} />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {selected && (
        <RightDrawer
          title={`${actionLabel(selected.action)} — ${entityLabel(selected.entity_type)}`}
          onClose={() => setSelected(null)}
          width="md:w-[520px] md:max-w-[92vw]"
        >
          <div className="space-y-5 text-body-sm">
            <div className="grid grid-cols-2 gap-3">
              <div><p className="text-label-sm text-on-surface-variant">Date</p><p className="text-on-surface">{fmtDateTime(selected.created_at)}</p></div>
              <div><p className="text-label-sm text-on-surface-variant">Utilisateur</p><p className="text-on-surface">{userLabel(selected)}</p></div>
              <div><p className="text-label-sm text-on-surface-variant">Type</p><p className="text-on-surface">{entityLabel(selected.entity_type)}{selected.entity_id ? ` #${selected.entity_id}` : ""}</p></div>
              <div><p className="text-label-sm text-on-surface-variant">Adresse IP</p><p className="text-on-surface">{selected.ip_address ?? "—"}</p></div>
            </div>

            <div>
              <p className="text-label-md font-medium text-on-surface-variant mb-2">Détail des changements</p>
              {selected.changes && Object.keys(selected.changes).length > 0 ? (
                <div className="rounded-2xl border border-outline-variant overflow-hidden overflow-x-auto">
                  <table className="w-full text-body-sm">
                    <thead>
                      <tr className="border-b border-outline-variant bg-surface-container/40 text-on-surface-variant">
                        <th className="text-left px-3 py-2 font-medium">Champ</th>
                        <th className="text-left px-3 py-2 font-medium">Avant</th>
                        <th className="text-left px-3 py-2 font-medium">Après</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Object.entries(selected.changes).map(([field, change]) => (
                        <tr key={field} className="border-b border-outline-variant last:border-0 align-top">
                          <td className="px-3 py-2 text-on-surface-variant whitespace-nowrap">{field}</td>
                          <td className="px-3 py-2 text-on-surface"><span className="line-through opacity-70">{fmtVal(change.before)}</span></td>
                          <td className="px-3 py-2 text-on-surface">{fmtVal(change.after)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-body-sm text-on-surface-variant">
                  Pas de détail de champ pour cette action (ex. consultation).
                </p>
              )}
            </div>
          </div>
        </RightDrawer>
      )}
    </div>
  );
}
