"use client";

import { useCallback, useEffect, useState } from "react";
import { RightDrawer } from "@repo/ui/RightDrawer";
import { usePermissions } from "@repo/auth/hooks/usePermissions";
import {
  AddOutlined,
  MedicationOutlined,
  WarningAmberOutlined,
  LockOutlined,
  CheckCircleOutlined,
  CancelOutlined,
  EditNoteOutlined,
} from "@mui/icons-material";
import {
  getPatientPrescriptions,
  getPrescription,
  type PrescriptionRead,
  type PrescriptionStatus,
} from "@/app/lib/prescriptions-api";

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
}: {
  prx: PrescriptionRead;
  onClick: () => void;
}) {
  const hasAllergyAlert = prx.items.some((i) => i.allergy_alert_raised);
  const hasOverride = prx.items.some((i) => i.allergy_overridden);
  const dateLabel = prx.prescribed_at ? fmtDate(prx.prescribed_at) : fmtDate(prx.created_at);

  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full text-left rounded-2xl border border-outline-variant bg-surface-container-lowest px-5 py-4 hover:border-primary/40 hover:bg-primary/4 transition-all group"
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
  );
}

// ─── PrescriptionDetailDrawer ─────────────────────────────────────────────────

function PrescriptionDetailDrawer({
  prxId,
  onClose,
}: {
  prxId: number;
  onClose: () => void;
}) {
  const [prx, setPrx] = useState<PrescriptionRead | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    getPrescription(prxId)
      .then(setPrx)
      .catch(() => setError("Impossible de charger la prescription."))
      .finally(() => setLoading(false));
  }, [prxId]);

  const title = prx
    ? `Prescription #${prx.id} — ${STATUS_LABEL[prx.status]}`
    : "Prescription";

  return (
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

            {/* ── Lignes médicaments ── */}
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

            {/* ── Actions (stubs P5.3 / P5.4) ── */}
            {prx.status === "SIGNEE" && (
              <div className="pt-2">
                <button
                  type="button"
                  disabled
                  title="Disponible dans une prochaine version"
                  className="w-full py-2 rounded-xl border border-outline-variant text-body-md text-on-surface-variant opacity-50 cursor-not-allowed"
                >
                  Télécharger le PDF
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </RightDrawer>
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
              disabled
              title="Création de prescription — disponible dans une prochaine version"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-on-primary text-body-md font-medium opacity-50 cursor-not-allowed"
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

      {/* ── List ── */}
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
        </div>
      ) : (
        <div className="space-y-3">
          {visible.map((prx) => (
            <PrescriptionCard
              key={prx.id}
              prx={prx}
              onClick={() => setSelectedId(prx.id)}
            />
          ))}
        </div>
      )}

      {/* ── Detail drawer ── */}
      {selectedId !== null && (
        <PrescriptionDetailDrawer
          prxId={selectedId}
          onClose={() => setSelectedId(null)}
        />
      )}
    </>
  );
}
