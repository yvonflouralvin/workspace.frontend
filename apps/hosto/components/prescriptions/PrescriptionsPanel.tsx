"use client";

import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { RightDrawer } from "@repo/ui/RightDrawer";
import { usePermissions } from "@repo/auth/hooks/usePermissions";
import {
  AddOutlined,
  BlockOutlined,
  CancelOutlined,
  CheckCircleOutlined,
  EditNoteOutlined,
  EditOutlined,
  ExpandMoreOutlined,
  LockOutlined,
  MedicationOutlined,
  PrintOutlined,
  WarningAmberOutlined,
} from "@mui/icons-material";
import {
  cancelPrescription,
  downloadPrescriptionPdf,
  getPatientPrescriptions,
  type PrescriptionRead,
  type PrescriptionItemRead,
  type PrescriptionStatus,
} from "@/app/lib/prescriptions-api";
import { PrescriptionEditor } from "./PrescriptionEditor";

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_LABEL: Record<PrescriptionStatus, string> = {
  BROUILLON: "Brouillon",
  SIGNEE:    "Signée",
  ANNULEE:   "Annulée",
};

const STATUS_CLS: Record<PrescriptionStatus, string> = {
  BROUILLON: "bg-surface-container text-on-surface-variant",
  SIGNEE:    "bg-secondary/10 text-secondary",
  ANNULEE:   "bg-error-container text-error",
};

const STATUS_ICON: Record<PrescriptionStatus, React.ReactNode> = {
  BROUILLON: <EditNoteOutlined style={{ fontSize: 14 }} />,
  SIGNEE:    <CheckCircleOutlined style={{ fontSize: 14 }} />,
  ANNULEE:   <CancelOutlined style={{ fontSize: 14 }} />,
};

type FilterStatus = PrescriptionStatus | "all";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function fmtDateTime(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function Skeleton() {
  return (
    <div className="space-y-2" aria-busy>
      {[1, 2, 3].map((i) => (
        <div key={i} className="rounded-2xl border border-outline-variant bg-surface-container-lowest p-4">
          <div className="flex items-center justify-between gap-4">
            <div className="space-y-2 flex-1">
              <div className="h-4 w-36 rounded bg-surface-container animate-pulse" />
              <div className="h-3 w-52 rounded bg-surface-container animate-pulse" />
            </div>
            <div className="h-6 w-6 rounded bg-surface-container animate-pulse" />
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── MedicationRow ────────────────────────────────────────────────────────────

function MedicationRow({ item }: { item: PrescriptionItemRead }) {
  const hasAlert = item.allergy_alert_raised || item.allergy_overridden;
  return (
    <tr className="border-b border-outline-variant/50 last:border-0">
      <td className="px-3 py-2.5 align-top">
        <div className="flex items-start gap-1.5">
          <span className="font-medium text-on-surface text-body-sm">{item.medication_name_cache}</span>
          {hasAlert && (
            <span title={item.allergy_overridden ? "Conflit forcé" : "Alerte allergie"}>
              {item.allergy_overridden
                ? <LockOutlined style={{ fontSize: 13 }} className="text-error shrink-0 mt-0.5" />
                : <WarningAmberOutlined style={{ fontSize: 13 }} className="text-error shrink-0 mt-0.5" />}
            </span>
          )}
        </div>
        {item.instructions && (
          <p className="text-label-sm text-on-surface-variant/70 italic mt-0.5">{item.instructions}</p>
        )}
      </td>
      <td className="px-3 py-2.5 text-body-sm text-on-surface-variant align-top whitespace-nowrap">{item.dosage || "—"}</td>
      <td className="px-3 py-2.5 text-body-sm text-on-surface-variant align-top whitespace-nowrap">{item.frequency || "—"}</td>
      <td className="px-3 py-2.5 text-body-sm text-on-surface-variant align-top whitespace-nowrap">{item.route || "—"}</td>
      <td className="px-3 py-2.5 text-body-sm text-on-surface-variant align-top whitespace-nowrap">{item.duration || "—"}</td>
    </tr>
  );
}

// ─── PrescriptionAccordion ────────────────────────────────────────────────────

function PrescriptionAccordion({
  prx,
  canWrite,
  onEdit,
  onEditSplit,
  onRefresh,
}: {
  prx: PrescriptionRead;
  canWrite: boolean;
  onEdit: () => void;
  onEditSplit?: () => void;
  onRefresh: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [pdfError, setPdfError] = useState<string | null>(null);
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [cancelling, setCancelling] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);

  const hasAllergyAlert = prx.items.some((i) => i.allergy_alert_raised && !i.allergy_overridden);
  const hasOverride     = prx.items.some((i) => i.allergy_overridden);
  const dateLabel       = fmtDate(prx.prescribed_at ?? prx.created_at);

  async function handlePdf(e: React.MouseEvent) {
    e.stopPropagation();
    setDownloadingPdf(true);
    setPdfError(null);
    try {
      await downloadPrescriptionPdf(prx.id);
    } catch {
      setPdfError("Impossible de générer le PDF.");
    } finally {
      setDownloadingPdf(false);
    }
  }

  async function handleCancel() {
    if (!cancelReason.trim()) return;
    setCancelling(true);
    setCancelError(null);
    try {
      await cancelPrescription(prx.id, cancelReason.trim());
      setCancelModalOpen(false);
      setCancelReason("");
      onRefresh();
    } catch (err) {
      setCancelError(err instanceof Error ? err.message : "Erreur lors de l'annulation.");
    } finally {
      setCancelling(false);
    }
  }

  return (
    <>
      <div className={`rounded-2xl border bg-surface-container-lowest transition-colors ${
        expanded ? "border-primary/40" : "border-outline-variant hover:border-primary/30"
      }`}>

        {/* ── Header ── */}
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="w-full text-left px-5 py-3.5 flex items-center gap-3"
        >
          {/* Statut */}
          <span className={`inline-flex items-center gap-1 text-label-sm px-2 py-0.5 rounded-full font-medium shrink-0 ${STATUS_CLS[prx.status]}`}>
            {STATUS_ICON[prx.status]}
            {STATUS_LABEL[prx.status]}
          </span>

          {/* Alertes */}
          {hasAllergyAlert && (
            <span className="inline-flex items-center gap-1 text-label-sm px-2 py-0.5 rounded-full bg-error-container text-error font-medium shrink-0">
              <WarningAmberOutlined style={{ fontSize: 12 }} />
              Allergie
            </span>
          )}
          {hasOverride && (
            <span className="inline-flex items-center gap-1 text-label-sm px-2 py-0.5 rounded-full bg-error-container text-error font-medium shrink-0">
              <LockOutlined style={{ fontSize: 12 }} />
              Conflit forcé
            </span>
          )}

          {/* Infos textuelles */}
          <div className="flex-1 min-w-0 flex items-baseline gap-3 flex-wrap">
            <span className="text-body-sm text-on-surface-variant">{dateLabel}</span>
            {prx.prescriber_id && (
              <span className="text-label-sm text-on-surface-variant/60">Prescripteur #{prx.prescriber_id}</span>
            )}
            <span className="text-label-sm text-on-surface-variant/60">
              {prx.items.length} médicament{prx.items.length !== 1 ? "s" : ""}
            </span>
          </div>

          {/* Edit (BROUILLON) */}
          {canWrite && prx.status === "BROUILLON" && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onEditSplit ? onEditSplit() : onEdit(); }}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-label-sm text-on-surface-variant hover:text-primary hover:bg-primary/8 transition-colors shrink-0"
            >
              <EditOutlined style={{ fontSize: 14 }} />
              Modifier
            </button>
          )}

          {/* Chevron */}
          <ExpandMoreOutlined
            style={{ fontSize: 20 }}
            className={`text-on-surface-variant/50 shrink-0 transition-transform duration-200 ${expanded ? "rotate-180" : ""}`}
          />
        </button>

        {/* ── Corps dépliable ── */}
        {expanded && (
          <div className="border-t border-outline-variant">

            {/* Notes de prescription */}
            {prx.notes && (
              <p className="px-5 py-3 text-body-sm text-on-surface-variant italic border-b border-outline-variant/50">
                {prx.notes}
              </p>
            )}

            {/* Médicaments */}
            {prx.items.length === 0 ? (
              <p className="px-5 py-4 text-body-sm text-on-surface-variant italic">Aucun médicament.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-body-sm">
                  <thead>
                    <tr className="bg-surface-container/40 border-b border-outline-variant/50">
                      <th className="text-left px-3 py-2 text-label-sm font-medium text-on-surface-variant">Médicament</th>
                      <th className="text-left px-3 py-2 text-label-sm font-medium text-on-surface-variant whitespace-nowrap">Dosage</th>
                      <th className="text-left px-3 py-2 text-label-sm font-medium text-on-surface-variant whitespace-nowrap">Fréquence</th>
                      <th className="text-left px-3 py-2 text-label-sm font-medium text-on-surface-variant whitespace-nowrap">Voie</th>
                      <th className="text-left px-3 py-2 text-label-sm font-medium text-on-surface-variant whitespace-nowrap">Durée</th>
                    </tr>
                  </thead>
                  <tbody>
                    {prx.items.map((item) => (
                      <MedicationRow key={item.id} item={item} />
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Métadonnées signature / annulation */}
            {(prx.signed_at || prx.cancel_reason) && (
              <div className="px-5 py-3 border-t border-outline-variant/50 text-body-sm text-on-surface-variant space-y-0.5">
                {prx.signed_at && (
                  <p>Signée le : <span className="text-on-surface">{fmtDateTime(prx.signed_at)}</span></p>
                )}
                {prx.cancel_reason && (
                  <p>Motif d&apos;annulation : <span className="text-on-surface">{prx.cancel_reason}</span></p>
                )}
              </div>
            )}

            {/* Actions */}
            {prx.status === "SIGNEE" && (
              <div className="px-5 py-3 border-t border-outline-variant/50 flex items-center gap-3 flex-wrap">
                <button
                  type="button"
                  onClick={handlePdf}
                  disabled={downloadingPdf}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-secondary text-on-secondary text-body-sm font-medium hover:opacity-90 disabled:opacity-50 transition-opacity"
                >
                  <PrintOutlined style={{ fontSize: 16 }} />
                  {downloadingPdf ? "Génération…" : "Imprimer / PDF"}
                </button>

                {canWrite && (
                  <button
                    type="button"
                    onClick={() => setCancelModalOpen(true)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-error/40 text-error text-body-sm hover:bg-error/8 transition-colors"
                  >
                    <BlockOutlined style={{ fontSize: 16 }} />
                    Annuler
                  </button>
                )}

                {pdfError && (
                  <p className="text-label-sm text-error">{pdfError}</p>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Modal annulation ── */}
      {cancelModalOpen && createPortal(
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/40">
          <div className="bg-surface rounded-2xl shadow-2xl p-6 w-full max-w-[28rem]">
            <div className="flex items-start gap-3 mb-4">
              <BlockOutlined className="text-error shrink-0 mt-0.5" style={{ fontSize: 22 }} />
              <div>
                <h2 className="text-title-sm font-semibold text-on-surface">Annuler la prescription</h2>
                <p className="text-body-sm text-on-surface-variant mt-1">
                  La prescription sera marquée comme annulée mais restera consultable.
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-1 mb-4">
              <label className="text-label-md font-medium text-on-surface-variant">
                Motif <span className="text-error">*</span>
              </label>
              <textarea
                className="w-full rounded-xl border border-outline-variant bg-surface-container-lowest px-3 py-2 text-body-md text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:border-error resize-none transition-colors"
                rows={3}
                placeholder="Ex : Erreur de prescription, changement de traitement…"
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                autoFocus
              />
            </div>

            {cancelError && (
              <p className="text-body-sm text-error bg-error-container/40 rounded-xl px-4 py-3 mb-4" role="alert">
                {cancelError}
              </p>
            )}

            <div className="flex gap-3 justify-end">
              <button
                type="button"
                onClick={() => { setCancelModalOpen(false); setCancelReason(""); setCancelError(null); }}
                disabled={cancelling}
                className="px-4 py-2 rounded-xl text-body-md text-on-surface-variant border border-outline-variant hover:bg-surface-container transition-colors disabled:opacity-50"
              >
                Fermer
              </button>
              <button
                type="button"
                onClick={handleCancel}
                disabled={cancelling || !cancelReason.trim()}
                className="px-4 py-2 rounded-xl text-body-md bg-error text-on-error hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {cancelling ? "Annulation…" : "Confirmer"}
              </button>
            </div>
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}

// ─── PrescriptionsPanel ───────────────────────────────────────────────────────

export function PrescriptionsPanel({
  patientId,
  encounterId,
  onSplit,
  onCloseSplit,
}: {
  patientId: number | string;
  encounterId?: number | string;
  onSplit?: (title: string, content: React.ReactNode) => void;
  onCloseSplit?: () => void;
}) {
  const { can } = usePermissions();
  const canView  = can("hosto.prescriptions.view");
  const canWrite = can("hosto.prescriptions.create");

  const [items, setItems]           = useState<PrescriptionRead[]>([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState<string | null>(null);
  const [filter, setFilter]         = useState<FilterStatus>("all");
  const [editorState, setEditorState] = useState<{ prescriptionId?: number } | null>(null);

  const load = useCallback(() => {
    if (!canView) return;
    setLoading(true);
    setError(null);
    getPatientPrescriptions(patientId)
      .then((res) => {
        const sorted = [...res].sort(
          (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
        );
        setItems(
          encounterId
            ? sorted.filter((p) => String(p.encounter_id) === String(encounterId))
            : sorted,
        );
      })
      .catch(() => setError("Impossible de charger les prescriptions."))
      .finally(() => setLoading(false));
  }, [patientId, encounterId, canView]);

  useEffect(() => { load(); }, [load]);

  if (!canView) {
    return (
      <div className="rounded-2xl border border-outline-variant bg-surface-container-lowest p-12 flex flex-col items-center gap-3 text-center">
        <LockOutlined style={{ fontSize: 32 }} className="text-on-surface-variant/30" />
        <p className="text-body-md text-on-surface-variant">Vous n&apos;avez pas accès aux prescriptions.</p>
      </div>
    );
  }

  const visible = filter === "all" ? items : items.filter((p) => p.status === filter);

  return (
    <>
      {/* ── Header ── */}
      <div className="flex items-center justify-between gap-4 mb-4 flex-wrap">
        <div>
          <h2 className="text-body-md font-semibold text-on-surface">Prescriptions</h2>
          {!loading && (
            <p className="text-body-sm text-on-surface-variant mt-0.5">
              {items.length} prescription{items.length !== 1 ? "s" : ""}
            </p>
          )}
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex rounded-xl border border-outline-variant overflow-hidden">
            {(["all", "BROUILLON", "SIGNEE", "ANNULEE"] as const).map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setFilter(f)}
                className={`px-3 py-1.5 text-body-sm transition-colors ${
                  filter === f
                    ? "bg-primary text-on-primary"
                    : "text-on-surface-variant hover:bg-surface-container"
                }`}
              >
                {f === "all" ? "Toutes" : STATUS_LABEL[f]}
              </button>
            ))}
          </div>

          {canWrite && (
            <button
              type="button"
              onClick={() => {
                if (onSplit) {
                  onSplit("Nouvelle prescription", (
                    <PrescriptionEditor
                      patientId={Number(patientId)}
                      encounterId={encounterId !== undefined ? Number(encounterId) : undefined}
                      bare
                      onClose={() => onCloseSplit?.()}
                      onSaved={() => { load(); onCloseSplit?.(); }}
                    />
                  ));
                } else {
                  setEditorState({});
                }
              }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-on-primary text-body-md font-medium hover:bg-primary-container transition-colors"
            >
              <AddOutlined style={{ fontSize: 18 }} />
              Nouvelle
            </button>
          )}
        </div>
      </div>

      {error && (
        <p className="text-body-sm text-error bg-error-container/40 rounded-xl px-4 py-3 mb-4">{error}</p>
      )}

      {/* ── Liste ── */}
      {loading ? (
        <Skeleton />
      ) : visible.length === 0 ? (
        <div className="rounded-2xl border border-outline-variant bg-surface-container-lowest p-12 flex flex-col items-center gap-3 text-center">
          <MedicationOutlined style={{ fontSize: 32 }} className="text-on-surface-variant/30" />
          <p className="text-body-md text-on-surface-variant">
            {filter === "all"
              ? "Aucune prescription enregistrée."
              : `Aucune prescription « ${STATUS_LABEL[filter as PrescriptionStatus]} ».`}
          </p>
          {canWrite && filter === "all" && (
            <button
              type="button"
              onClick={() => {
                if (onSplit) {
                  onSplit("Nouvelle prescription", (
                    <PrescriptionEditor
                      patientId={Number(patientId)}
                      encounterId={encounterId !== undefined ? Number(encounterId) : undefined}
                      bare
                      onClose={() => onCloseSplit?.()}
                      onSaved={() => { load(); onCloseSplit?.(); }}
                    />
                  ));
                } else {
                  setEditorState({});
                }
              }}
              className="text-body-sm text-primary underline underline-offset-2 hover:opacity-70 transition-opacity"
            >
              Créer une prescription
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {visible.map((prx) => (
            <PrescriptionAccordion
              key={prx.id}
              prx={prx}
              canWrite={canWrite}
              onEdit={() => setEditorState({ prescriptionId: prx.id })}
              onEditSplit={onSplit ? () => onSplit("Modifier la prescription", (
                <PrescriptionEditor
                  patientId={Number(patientId)}
                  encounterId={encounterId !== undefined ? Number(encounterId) : undefined}
                  prescriptionId={prx.id}
                  bare
                  onClose={() => onCloseSplit?.()}
                  onSaved={() => { load(); onCloseSplit?.(); }}
                />
              )) : undefined}
              onRefresh={load}
            />
          ))}
        </div>
      )}

      {/* ── Éditeur ── */}
      {editorState !== null && (
        <PrescriptionEditor
          patientId={Number(patientId)}
          encounterId={encounterId !== undefined ? Number(encounterId) : undefined}
          prescriptionId={editorState.prescriptionId}
          onClose={() => setEditorState(null)}
          onSaved={() => { setEditorState(null); load(); }}
        />
      )}
    </>
  );
}
