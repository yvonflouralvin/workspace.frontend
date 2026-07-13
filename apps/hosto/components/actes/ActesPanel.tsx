"use client";

import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { usePermissions } from "@repo/auth/hooks/usePermissions";
import {
  AddOutlined,
  BlockOutlined,
  LockOutlined,
} from "@mui/icons-material";
import {
  getPatientActes,
  getEncounterActes,
  annulerActe,
  type ActePrescrit,
} from "@/app/lib/actes-api";
import { ActesTable } from "./ActesTable";
import { PrescrireDrawer } from "./PrescrireDrawer";
import { RealiserDrawer } from "./RealiserDrawer";
import { ActesHistoryView } from "./ActesHistoryView";

// ─── CancelModal ───────────────────────────────────────────────────────────────

function CancelModal({
  acte,
  onClose,
  onDone,
}: {
  acte: ActePrescrit;
  onClose: () => void;
  onDone: () => void;
}) {
  const [motif, setMotif] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleConfirm() {
    if (!motif.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      await annulerActe(acte.id, motif.trim());
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur lors de l'annulation.");
    } finally {
      setSubmitting(false);
    }
  }

  return createPortal(
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/40">
      <div className="bg-surface rounded-2xl shadow-2xl p-6 w-full max-w-[28rem]">
        <div className="flex items-start gap-3 mb-4">
          <BlockOutlined className="text-error shrink-0 mt-0.5" style={{ fontSize: 22 }} />
          <div>
            <h2 className="text-body-lg font-semibold text-on-surface">Annuler l&apos;acte</h2>
            <p className="text-body-sm text-on-surface-variant mt-1">
              « {acte.acte_libelle} » sera marqué annulé. La commande de facturation associée
              sera annulée chez Facturation.
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-1 mb-4">
          <label className="text-label-md font-medium text-on-surface-variant">
            Motif <span className="text-error">*</span>
          </label>
          <textarea
            className="w-full rounded-xl border border-outline-variant bg-surface-container-lowest px-3 py-2 text-body-md text-on-surface focus:outline-none focus:border-error resize-none transition-colors"
            rows={3}
            placeholder="Ex : patient reparti, acte non nécessaire…"
            value={motif}
            onChange={(e) => setMotif(e.target.value)}
            autoFocus
          />
        </div>

        {error && (
          <p className="text-body-sm text-error bg-error-container/40 rounded-xl px-4 py-3 mb-4" role="alert">
            {error}
          </p>
        )}

        <div className="flex gap-3 justify-end">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="px-4 py-2 rounded-xl text-body-md text-on-surface-variant border border-outline-variant hover:bg-surface-container transition-colors disabled:opacity-50"
          >
            Fermer
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={submitting || !motif.trim()}
            className="px-4 py-2 rounded-xl text-body-md bg-error text-on-error hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {submitting ? "Annulation…" : "Confirmer"}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

// ─── ActesPanel ────────────────────────────────────────────────────────────────

export function ActesPanel({
  patientId,
  encounterId,
  onMutation,
  onSplit,
  onCloseSplit,
}: {
  patientId: number | string;
  encounterId?: number | string;
  // Contexte d'hospitalisation (H5). Optionnel et non invasif : les actes restent
  // indexés par patient côté backend (ActePrescrit n'a pas de sejour_id), donc la
  // liste affichée est inchangée. Accepté ici pour l'affichage/le futur rattachement
  // sans casser les appelants existants (EMR, consultation).
  sejourId?: number | string;
  onMutation?: () => void;
  // Quand fournis (EMR/consultation), les formulaires s'ouvrent dans le SplitWorkspace
  // (dossier patient visible à gauche) au lieu d'un RightDrawer.
  onSplit?: (title: string, content: React.ReactNode) => void;
  onCloseSplit?: () => void;
}) {
  const { can } = usePermissions();
  const canView = can("hosto.actes.view");
  const canPrescribe = can("hosto.actes.prescribe");
  const canPerform = can("hosto.actes.perform");

  const [items, setItems] = useState<ActePrescrit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [prescrireOpen, setPrescrireOpen] = useState(false);
  const [realiserActe, setRealiserActe] = useState<ActePrescrit | null>(null);
  const [cancelActe, setCancelActe] = useState<ActePrescrit | null>(null);
  const [view, setView] = useState<"encours" | "historique">("encours");

  const load = useCallback(() => {
    if (!canView) return;
    setLoading(true);
    setError(null);
    const p = encounterId
      ? getEncounterActes(encounterId)
      : getPatientActes(patientId);
    p
      .then((res) => {
        setItems(
          [...res].sort(
            (a, b) =>
              new Date(b.prescribed_at ?? b.created_at ?? 0).getTime() -
              new Date(a.prescribed_at ?? a.created_at ?? 0).getTime(),
          ),
        );
      })
      .catch(() => setError("Impossible de charger les actes."))
      .finally(() => setLoading(false));
  }, [patientId, encounterId, canView]);

  useEffect(() => {
    load();
  }, [load]);

  function refresh() {
    load();
    onMutation?.();
  }

  function openPrescribe() {
    if (onSplit) {
      onSplit(
        "Prescrire un acte",
        <PrescrireDrawer
          patientId={Number(patientId)}
          encounterId={encounterId !== undefined ? Number(encounterId) : undefined}
          canPerform={canPerform}
          bare
          onClose={() => onCloseSplit?.()}
          onDone={() => {
            onCloseSplit?.();
            refresh();
          }}
        />,
      );
    } else {
      setPrescrireOpen(true);
    }
  }

  function openRealise(acte: ActePrescrit) {
    if (onSplit) {
      onSplit(
        `Réaliser — ${acte.acte_libelle}`,
        <RealiserDrawer
          acte={acte}
          bare
          onClose={() => onCloseSplit?.()}
          onDone={() => {
            onCloseSplit?.();
            refresh();
          }}
        />,
      );
    } else {
      setRealiserActe(acte);
    }
  }

  if (!canView) {
    return (
      <div className="rounded-2xl border border-outline-variant bg-surface-container-lowest p-12 flex flex-col items-center gap-3 text-center">
        <LockOutlined style={{ fontSize: 32 }} className="text-on-surface-variant/30" />
        <p className="text-body-md text-on-surface-variant">Vous n&apos;avez pas accès aux actes.</p>
      </div>
    );
  }

  return (
    <>
      {/* Header */}
      <div className="flex items-center justify-between gap-4 mb-4 flex-wrap">
        <div className="flex rounded-xl border border-outline-variant overflow-hidden">
          {(["encours", "historique"] as const).map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => setView(v)}
              className={`px-3 py-1.5 text-body-sm transition-colors ${
                view === v
                  ? "bg-primary text-on-primary"
                  : "text-on-surface-variant hover:bg-surface-container"
              }`}
            >
              {v === "encours" ? "En cours" : "Historique"}
            </button>
          ))}
        </div>
        {view === "encours" && canPrescribe && (
          <button
            type="button"
            onClick={openPrescribe}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-on-primary text-body-md font-medium hover:bg-primary-container transition-colors"
          >
            <AddOutlined style={{ fontSize: 18 }} />
            Prescrire un acte
          </button>
        )}
      </div>

      {view === "historique" ? (
        <ActesHistoryView patientId={patientId} />
      ) : (
        <>
      {error && (
        <p className="text-body-sm text-error bg-error-container/40 rounded-xl px-4 py-3 mb-4">{error}</p>
      )}
      <ActesTable
        items={items}
        loading={loading}
        canPrescribe={canPrescribe}
        canPerform={canPerform}
        onRealiser={openRealise}
        onAnnuler={setCancelActe}
        onPrescribe={openPrescribe}
      />
        </>
      )}

      {/* Drawers / modales */}
      {prescrireOpen && (
        <PrescrireDrawer
          patientId={Number(patientId)}
          encounterId={encounterId !== undefined ? Number(encounterId) : undefined}
          canPerform={canPerform}
          onClose={() => setPrescrireOpen(false)}
          onDone={() => {
            setPrescrireOpen(false);
            refresh();
          }}
        />
      )}
      {realiserActe && (
        <RealiserDrawer
          acte={realiserActe}
          onClose={() => setRealiserActe(null)}
          onDone={() => {
            setRealiserActe(null);
            refresh();
          }}
        />
      )}
      {cancelActe && (
        <CancelModal
          acte={cancelActe}
          onClose={() => setCancelActe(null)}
          onDone={() => {
            setCancelActe(null);
            refresh();
          }}
        />
      )}
    </>
  );
}
