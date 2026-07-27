"use client";

import { useState } from "react";
import { RightDrawer } from "@repo/ui/RightDrawer";
import { CheckCircleOutlined } from "@mui/icons-material";
import {
  realiserActe,
  PaymentRequiredError,
  type ActePrescrit,
  type RealiserPayload,
} from "@/app/lib/actes-api";
import {
  RealiserFields,
  PaiementRequisNotice,
  type RealiserState,
  nowLocalInput,
} from "./shared";

export function RealiserDrawer({
  acte,
  onClose,
  onDone,
  bare = false,
}: {
  acte: ActePrescrit;
  onClose: () => void;
  onDone: (updated: ActePrescrit) => void;
  bare?: boolean;
}) {
  const [state, setState] = useState<RealiserState>({
    observations: "",
    complications: "",
    quantiteRealisee: acte.quantite,
    performedAt: nowLocalInput(),
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [paymentRefused, setPaymentRefused] = useState<string | null>(null);

  function patch(p: Partial<RealiserState>) {
    setState((s) => ({ ...s, ...p }));
  }

  function buildPayload(): RealiserPayload {
    return {
      observations: state.observations.trim() || null,
      complications: state.complications.trim() || null,
      quantite_realisee: state.quantiteRealisee,
      performed_at: state.performedAt ? new Date(state.performedAt).toISOString() : null,
    };
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setPaymentRefused(null);
    try {
      const updated = await realiserActe(acte.id, buildPayload());
      onDone(updated);
    } catch (err) {
      if (err instanceof PaymentRequiredError) {
        setPaymentRefused(err.message);
      } else {
        setError(err instanceof Error ? err.message : "Erreur lors de la réalisation.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  const inner = (
      <form onSubmit={handleSubmit} className="h-full flex flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto pr-1 space-y-4">
          {acte.indication && (
            <p className="text-body-sm text-on-surface-variant">
              <span className="font-medium text-on-surface">Indication :</span> {acte.indication}
            </p>
          )}

          {paymentRefused && <PaiementRequisNotice message={paymentRefused} tone="warn" />}

          <RealiserFields state={state} onChange={patch} maxQuantite={acte.quantite} />

          {error && (
            <p className="text-body-sm text-error bg-error-container/40 rounded-xl px-4 py-3" role="alert">
              {error}
            </p>
          )}
        </div>

        <div className="shrink-0 flex gap-3 pt-4 border-t border-outline-variant">
          <button
            type="submit"
            disabled={submitting}
            className="flex-1 inline-flex items-center justify-center gap-2 py-2 rounded-xl bg-secondary text-on-secondary text-body-md font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            <CheckCircleOutlined style={{ fontSize: 18 }} />
            {submitting ? "Enregistrement…" : "Confirmer la réalisation"}
          </button>
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="px-5 py-2 rounded-xl text-body-md text-on-surface-variant border border-outline-variant hover:bg-surface-container transition-colors disabled:opacity-50"
          >
            Annuler
          </button>
        </div>
      </form>
  );

  if (bare) return inner;
  return (
    <RightDrawer title={`Réaliser — ${acte.acte_libelle}`} onClose={onClose} width="md:w-[560px] md:max-w-[92vw]">
      {inner}
    </RightDrawer>
  );
}
