"use client";

import { useCallback, useEffect, useState } from "react";
import { RightDrawer } from "@repo/ui/RightDrawer";
import { usePermissions } from "@repo/auth/hooks/usePermissions";
import {
  AddOutlined,
  BlockOutlined,
  CancelOutlined,
  CheckCircleOutlined,
  EditNoteOutlined,
  EditOutlined,
  LockOutlined,
  MedicationOutlined,
  PrintOutlined,
  WarningAmberOutlined,
} from "@mui/icons-material";
import {
  cancelPrescription,
  downloadPrescriptionPdf,
  getPatientPrescriptions,
  getPrescription,
  type PrescriptionRead,
  type PrescriptionStatus,
} from "@/app/lib/prescriptions-api";
import { PrescriptionEditor } from "./PrescriptionEditor";

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_LABEL: Record<PrescriptionStatus, string> = {
  BROUILLON: "Brouillon",
  SIGNEE: "Signée",
  ANNULEE: "Annulée",
};

const STATUS_CLS: Record<PrescriptionStatus, string> = {
  BROUILLON: "bg-surface-container text-on-surface-variant",
  SIGNEE: "bg-secondary/10 text-secondary",
  ANNULEE: "bg-error-container text-error",
};

const STATUS_ICON: Record<PrescriptionStatus, React.ReactNode> = {
  BROUILLON: <EditNoteOutlined style={{ fontSize: 14 }} />,
  SIGNEE: <CheckCircleOutlined style={{ fontSize: 14 }} />,
  ANNULEE: <CancelOutlined style={{ fontSize: 14 }} />,
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
    <div className="space-y-3" aria-busy>
      {[1, 2, 3].map((i) => (
        <div key={i} className="rounded-2xl border border-outline-variant bg-surface-container-lowest p-5">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-2 flex-1">
              <div className="h-4 w-40 rounded bg-surface-container animate-pulse" />
              <div className="h-3 w-56 rounded bg-surface-container animate-pulse" />
            </div>
            <div className="h-6 w-20 rounded-full bg-surface-container animate-pulse" />
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── PrescriptionCard ─────────────────────────────────────────────────────────

function PrescriptionCard({
  prx,
  onClick,
  onEdit,
}: {
  prx: PrescriptionRead;
  onClick: () => void;
  onEdit?: () => void;
}) {
  const hasAllergyAlert = prx.items.some((i) => i.allergy_alert_raised);
  const hasOverride = prx.items.some((i) => i.allergy_overridden);
  const dateLabel = prx.prescribed_at ? fmtDate(prx.prescribed_at) : fmtDate(prx.created_at);

  return (
    <div className="rounded-2xl border border-outline-variant bg-surface-container-lowest hover:border-primary/40 transition-all">
      <button
        type="button"
        onClick={onClick}
        className="w-full text-left px-5 py-4 group"
      >
        <div className="flex items-start gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className={`inline-flex items-center gap-1 text-label-sm px-2 py-0.5 rounded-full font-medium ${STATUS_CLS[prx.status]}`}>
                {STATUS_ICON[prx.status]}
                {STATUS_LABEL[prx.status]}
              </span>
              {hasAllergyAlert && !hasOverride && (
                <span className="inline-flex items-center gap-1 text-label-sm px-2 py-0.5 rounded-full bg-error-container text-error font-medium">
                  <WarningAmberOutlined style={{ fontSize: 13 }} />
                  Alerte allergie
                </span>
              )}
              {hasOverride && (
                <span className="inline-flex items-center gap-1 text-label-sm px-2 py-0.5 rounded-full bg-error-container text-error font-medium">
                  <LockOutlined style={{ fontSize: 13 }} />
                  Conflit forcé
                </span>
              )}
            </div>

            <p className="text-body-sm text-on-surface-variant mt-1">
              {dateLabel}
              {prx.prescriber_id && (
                <span className="ml-2 text-on-surface-variant/60">· Prescripteur #{prx.prescriber_id}</span>
              )}
            </p>

            <p className="text-body-sm text-on-surface-variant mt-0.5">
              {prx.items.length} médicament{prx.items.length !== 1 ? "s" : ""}
              {prx.notes && (
                <span className="ml-2 italic text-on-surface-variant/70 truncate max-w-xs inline-block align-bottom">
                  · {prx.notes}
                </span>
              )}
            </p>
          </div>

          <MedicationOutlined
            style={{ fontSize: 20 }}
            className="text-on-surface-variant/30 group-hover:text-primary/50 transition-colors shrink-0 mt-0.5"
          />
        </div>
      </button>

      {onEdit && prx.status === "BROUILLON" && (
        <div className="px-5 pb-3 flex justify-end">
          <button
            type="button"
            onClick={onEdit}
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-body-sm text-on-surface-variant hover:text-primary hover:bg-primary/8 transition-colors"
          >
            <EditOutlined style={{ fontSize: 15 }} />
            Modifier
          </button>
        </div>
      )}
    </div>
  );
}

// ─── PrescriptionDetailDrawer ─────────────────────────────────────────────────

function PrescriptionDetailDrawer({
  prxId,
  onClose,
  canWrite,
  onRefresh,
}: {
  prxId: number;
  onClose: () => void;
  canWrite: boolean;
  onRefresh: () => void;
}) {
  const [prx, setPrx] = useState<PrescriptionRead | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [pdfError, setPdfError] = useState<string | null>(null);

  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [cancelling, setCancelling] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    getPrescription(prxId)
      .then(setPrx)
      .catch(() => setError("Impossible de charger la prescription."))
      .finally(() => setLoading(false));
  }, [prxId]);

  async function handlePdf() {
    if (!prx) return;
    setDownloadingPdf(true);
    setPdfError(null);
    try {
      await downloadPrescriptionPdf(prx.id);
    } catch {
      setPdfError("Impossible de générer le PDF. Le service est peut-être indisponible.");
    } finally {
      setDownloadingPdf(false);
    }
  }

  async function handleCancel() {
    if (!cancelReason.trim()) return;
    setCancelling(true);
    setCancelError(null);
    try {
      const updated = await cancelPrescription(prxId, cancelReason.trim());
      setPrx(updated);
      setCancelModalOpen(false);
      setCancelReason("");
      onRefresh();
    } catch (err) {
      setCancelError(err instanceof Error ? err.message : "Erreur lors de l'annulation.");
    } finally {
      setCancelling(false);
    }
  }

  const title = prx
    ? `Prescription #${prx.id} — ${STATUS_LABEL[prx.status]}`
    : "Prescription";

  return (
    <>
      <RightDrawer title={title} onClose={onClose}>
        <div className="h-full overflow-y-auto space-y-5">
          {error && (
            <p className="text-body-sm text-error bg-error-container/40 rounded-xl px-4 py-3">{error}</p>
          )}

          {loading && (
            <div className="space-y-3 animate-pulse">
              <div className="h-4 w-48 rounded bg-surface-container" />
              <div className="h-3 w-32 rounded bg-surface-container" />
              <div className="h-24 rounded-xl bg-surface-container mt-4" />
            </div>
          )}

          {prx && (
            <>
              {/* ── En-tête ── */}
              <div className="rounded-xl bg-surface-container-lowest border border-outline-variant p-4 space-y-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`inline-flex items-center gap-1 text-label-sm px-2 py-0.5 rounded-full font-medium ${STATUS_CLS[prx.status]}`}>
                    {STATUS_ICON[prx.status]}
                    {STATUS_LABEL[prx.status]}
                  </span>
                  {prx.status === "SIGNEE" && (
                    <span className="inline-flex items-center gap-1 text-label-sm text-on-surface-variant/60">
                      <LockOutlined style={{ fontSize: 13 }} />
                      Immuable
                    </span>
                  )}
                </div>

                <div className="text-body-sm text-on-surface-variant space-y-1 mt-2">
                  <p>
                    <span className="font-medium text-on-surface">Date :</span>{" "}
                    {prx.prescribed_at ? fmtDateTime(prx.prescribed_at) : fmtDateTime(prx.created_at)}
                  </p>
                  {prx.prescriber_id && (
                    <p>
                      <span className="font-medium text-on-surface">Prescripteur :</span>{" "}
                      #{prx.prescriber_id}
                    </p>
                  )}
                  {prx.signed && prx.signed_at && (
                    <p>
                      <span className="font-medium text-on-surface">Signée le :</span>{" "}
                      {fmtDateTime(prx.signed_at)}
                    </p>
                  )}
                  {prx.status === "ANNULEE" && prx.cancel_reason && (
                    <p>
                      <span className="font-medium text-on-surface">Motif d&apos;annulation :</span>{" "}
                      {prx.cancel_reason}
                    </p>
                  )}
                  {prx.notes && (
                    <p>
                      <span className="font-medium text-on-surface">Notes :</span>{" "}
                      {prx.notes}
                    </p>
                  )}
                </div>
              </div>

              {/* ── Médicaments ── */}
              <div>
                <h3 className="text-label-md font-medium text-on-surface-variant mb-2 uppercase tracking-wide">
                  Médicaments ({prx.items.length})
                </h3>
                {prx.items.length === 0 ? (
                  <p className="text-body-sm text-on-surface-variant italic">Aucun médicament.</p>
                ) : (
                  <div className="rounded-xl border border-outline-variant overflow-hidden divide-y divide-outline-variant">
                    {prx.items.map((item) => (
                      <div key={item.id} className="px-4 py-3 bg-surface-container-lowest">
                        <div className="flex items-start gap-3">
                          <div className="flex-1 min-w-0">
                            <p className="text-body-md font-semibold text-on-surface">
                              {item.medication_name_cache}
                            </p>
                            <p className="text-body-sm text-on-surface-variant mt-0.5">
                              {[item.dosage, item.frequency, item.route].filter(Boolean).join(" · ")}
                              {item.duration && (
                                <span className="ml-2 text-on-surface-variant/70">
                                  · {item.duration}
                                </span>
                              )}
                            </p>
                            {item.instructions && (
                              <p className="text-body-sm text-on-surface-variant/70 italic mt-0.5">
                                {item.instructions}
                              </p>
                            )}
                          </div>

                          <div className="flex flex-col gap-1 items-end shrink-0">
                            {item.allergy_overridden && (
                              <span className="inline-flex items-center gap-1 text-label-sm px-2 py-0.5 rounded-full bg-error-container text-error font-medium">
                                <LockOutlined style={{ fontSize: 12 }} />
                                Conflit forcé
                              </span>
                            )}
                            {item.allergy_alert_raised && !item.allergy_overridden && (
                              <span className="inline-flex items-center gap-1 text-label-sm px-2 py-0.5 rounded-full bg-error-container text-error font-medium">
                                <WarningAmberOutlined style={{ fontSize: 12 }} />
                                Alerte
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* ── Actions ── */}
              <div className="space-y-3 pt-1">
                {prx.status === "SIGNEE" && (
                  <button
                    type="button"
                    onClick={handlePdf}
                    disabled={downloadingPdf}
                    className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-secondary text-on-secondary text-body-md font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
                  >
                    <PrintOutlined style={{ fontSize: 18 }} />
                    {downloadingPdf ? "Génération du PDF…" : "Imprimer / Télécharger l'ordonnance"}
                  </button>
                )}

                {pdfError && (
                  <p className="text-body-sm text-error bg-error-container/40 rounded-xl px-4 py-3" role="alert">
                    {pdfError}
                  </p>
                )}

                {prx.status === "SIGNEE" && canWrite && (
                  <button
                    type="button"
                    onClick={() => setCancelModalOpen(true)}
                    className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-error/50 text-error text-body-md hover:bg-error/8 transition-colors"
                  >
                    <BlockOutlined style={{ fontSize: 18 }} />
                    Annuler la prescription
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </RightDrawer>

      {/* ── Modal annulation ── */}
      {cancelModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="bg-surface rounded-2xl shadow-2xl p-6 w-full max-w-md">
            <div className="flex items-start gap-3 mb-4">
              <BlockOutlined className="text-error shrink-0 mt-0.5" style={{ fontSize: 22 }} />
              <div>
                <h2 className="text-title-sm font-semibold text-on-surface">
                  Annuler la prescription
                </h2>
                <p className="text-body-sm text-on-surface-variant mt-1">
                  La prescription sera marquée comme annulée. Cette action ne supprime pas la prescription — elle reste consultable.
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-1 mb-4">
              <label className="text-label-md font-medium text-on-surface-variant">
                Motif d&apos;annulation <span className="text-error">*</span>
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
                onClick={() => {
                  setCancelModalOpen(false);
                  setCancelReason("");
                  setCancelError(null);
                }}
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
                {cancelling ? "Annulation…" : "Confirmer l'annulation"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ─── PrescriptionsPanel ───────────────────────────────────────────────────────

export function PrescriptionsPanel({
  patientId,
  encounterId,
}: {
  patientId: number | string;
  encounterId?: number | string;
}) {
  const { can } = usePermissions();
  const canView = can("hosto.prescriptions.view");
  const canWrite = can("hosto.prescriptions.create");

  const [items, setItems] = useState<PrescriptionRead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterStatus>("all");
  const [selectedId, setSelectedId] = useState<number | null>(null);
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
        const filtered = encounterId
          ? sorted.filter((p) => String(p.encounter_id) === String(encounterId))
          : sorted;
        setItems(filtered);
      })
      .catch(() => setError("Impossible de charger les prescriptions."))
      .finally(() => setLoading(false));
  }, [patientId, encounterId, canView]);

  useEffect(() => { load(); }, [load]);

  function openNewEditor() {
    setSelectedId(null);
    setEditorState({});
  }

  function openEditEditor(prescriptionId: number) {
    setSelectedId(null);
    setEditorState({ prescriptionId });
  }

  function onEditorSaved() {
    setEditorState(null);
    load();
  }

  if (!canView) {
    return (
      <div className="rounded-2xl border border-outline-variant bg-surface-container-lowest p-12 flex flex-col items-center gap-3 text-center">
        <LockOutlined style={{ fontSize: 32 }} className="text-on-surface-variant/30" />
        <p className="text-body-md text-on-surface-variant">
          Vous n&apos;avez pas accès aux prescriptions.
        </p>
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
              onClick={openNewEditor}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-on-primary text-body-md font-medium hover:bg-primary-container transition-colors"
            >
              <AddOutlined style={{ fontSize: 18 }} />
              Nouvelle
            </button>
          )}
        </div>
      </div>

      {error && (
        <p className="text-body-sm text-error bg-error-container/40 rounded-xl px-4 py-3 mb-4">
          {error}
        </p>
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
              onClick={openNewEditor}
              className="text-body-sm text-primary underline underline-offset-2 hover:opacity-70 transition-opacity"
            >
              Créer une prescription
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {visible.map((prx) => (
            <PrescriptionCard
              key={prx.id}
              prx={prx}
              onClick={() => setSelectedId(prx.id)}
              onEdit={canWrite ? () => openEditEditor(prx.id) : undefined}
            />
          ))}
        </div>
      )}

      {/* ── Détail ── */}
      {selectedId !== null && editorState === null && (
        <PrescriptionDetailDrawer
          prxId={selectedId}
          onClose={() => setSelectedId(null)}
          canWrite={canWrite}
          onRefresh={load}
        />
      )}

      {/* ── Éditeur ── */}
      {editorState !== null && (
        <PrescriptionEditor
          patientId={Number(patientId)}
          encounterId={encounterId !== undefined ? Number(encounterId) : undefined}
          prescriptionId={editorState.prescriptionId}
          onClose={() => setEditorState(null)}
          onSaved={onEditorSaved}
        />
      )}
    </>
  );
}
