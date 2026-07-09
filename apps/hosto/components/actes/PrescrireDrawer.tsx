"use client";

import { useState } from "react";
import { RightDrawer } from "@repo/ui/RightDrawer";
import { SearchSelect } from "@repo/ui/SearchSelect";
import {
  ArrowBackOutlined,
  BoltOutlined,
  PlaylistAddCheckOutlined,
} from "@mui/icons-material";
import {
  searchActes,
  prescrireActe,
  prescrireEtRealiser,
  PaymentRequiredError,
  type ActeCatalogItem,
  type ActeType,
  type ActePrescrit,
} from "@/app/lib/actes-api";
import {
  getPatientEncounters,
  createEncounter,
  type EncounterRead,
} from "@/app/lib/emr-api";
import {
  RealiserFields,
  PaiementRequisNotice,
  type RealiserState,
  nowLocalInput,
} from "./shared";

const inputCls =
  "w-full rounded-xl border border-outline-variant bg-surface-container-lowest px-3 py-2 text-body-md text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:border-primary transition-colors";
const labelCls = "text-label-md font-medium text-on-surface-variant";

const TYPE_FILTERS: { key: "all" | ActeType; label: string }[] = [
  { key: "all", label: "Tous" },
  { key: "MEDICAL", label: "Médical" },
  { key: "INFIRMIER", label: "Infirmier" },
];

function acteLabel(a: ActeCatalogItem): string {
  return a.category ? `${a.libelle} — ${a.category}` : a.libelle;
}

export function PrescrireDrawer({
  patientId,
  encounterId,
  canPerform,
  onClose,
  onDone,
  bare = false,
}: {
  patientId: number;
  encounterId?: number;
  canPerform: boolean;
  onClose: () => void;
  onDone: () => void;
  bare?: boolean;
}) {
  const [typeFilter, setTypeFilter] = useState<"all" | ActeType>("all");
  const [selected, setSelected] = useState<ActeCatalogItem | null>(null);
  const [quantite, setQuantite] = useState(1);
  const [indication, setIndication] = useState("");
  const [step, setStep] = useState<"form" | "realiser">("form");
  const [realiser, setRealiser] = useState<RealiserState>({
    observations: "",
    complications: "",
    quantiteRealisee: 1,
    performedAt: nowLocalInput(),
  });

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [paymentRefused, setPaymentRefused] = useState<string | null>(null);

  async function resolveEncounter(): Promise<number> {
    if (encounterId) return encounterId;
    const { items } = await getPatientEncounters(patientId, { per_page: 10 });
    const ongoing = items.find((e: EncounterRead) => e.status === "EN_COURS");
    if (ongoing) return ongoing.id;
    const created = await createEncounter({
      patient_id: patientId,
      type: "CONSULTATION",
      status: "EN_COURS",
    });
    return created.id;
  }

  function basePayload(encId: number) {
    return {
      acte_catalog_id: selected!.id,
      patient_id: patientId,
      encounter_id: encId,
      quantite,
      indication: indication.trim() || null,
    };
  }

  async function handlePrescrire() {
    if (!selected) return;
    setSubmitting(true);
    setError(null);
    try {
      const encId = await resolveEncounter();
      await prescrireActe(basePayload(encId));
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur lors de la prescription.");
    } finally {
      setSubmitting(false);
    }
  }

  function goRealiserStep() {
    if (!selected) return;
    setPaymentRefused(null);
    // Un acte bloquant ne peut être réalisé sans paiement, et le paiement ne peut
    // précéder la prescription : on l'explique plutôt que d'ouvrir un formulaire voué à l'échec.
    if (selected.paiement_bloquant) {
      setPaymentRefused(
        "Cet acte requiert un paiement préalable : prescrivez-le, puis le patient règle avant qu'il soit réalisé.",
      );
      return;
    }
    setRealiser((r) => ({ ...r, quantiteRealisee: quantite, performedAt: nowLocalInput() }));
    setStep("realiser");
  }

  async function handlePrescrireEtRealiser() {
    if (!selected) return;
    setSubmitting(true);
    setError(null);
    setPaymentRefused(null);
    try {
      const encId = await resolveEncounter();
      await prescrireEtRealiser({
        ...basePayload(encId),
        observations: realiser.observations.trim() || null,
        complications: realiser.complications.trim() || null,
        quantite_realisee: realiser.quantiteRealisee,
        performed_at: realiser.performedAt ? new Date(realiser.performedAt).toISOString() : null,
      });
      onDone();
    } catch (err) {
      if (err instanceof PaymentRequiredError) {
        setStep("form");
        setPaymentRefused(err.message);
      } else {
        setError(err instanceof Error ? err.message : "Erreur lors de la réalisation.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  const title = step === "realiser" ? "Prescrire et réaliser" : "Prescrire un acte";

  const inner = (
      <div className="h-full flex flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto pr-1 space-y-5">
          {step === "form" ? (
            <>
              {/* Filtre par type */}
              <div className="flex rounded-xl border border-outline-variant overflow-hidden w-fit">
                {TYPE_FILTERS.map((f) => (
                  <button
                    key={f.key}
                    type="button"
                    onClick={() => setTypeFilter(f.key)}
                    className={`px-3 py-1.5 text-body-sm transition-colors ${
                      typeFilter === f.key
                        ? "bg-primary text-on-primary"
                        : "text-on-surface-variant hover:bg-surface-container"
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>

              {/* Picker d'acte */}
              <div>
                <p className={`${labelCls} mb-1.5`}>Acte</p>
                <SearchSelect<ActeCatalogItem>
                  key={typeFilter}
                  fetchOptions={(q) =>
                    searchActes(q, typeFilter === "all" ? undefined : typeFilter)
                  }
                  value={selected?.id ?? null}
                  onChange={(_, rec) => {
                    setSelected(rec);
                    setPaymentRefused(null);
                  }}
                  getOptionLabel={acteLabel}
                  placeholder="Rechercher un acte (nom, catégorie)…"
                />
              </div>

              {selected?.paiement_bloquant && !paymentRefused && (
                <PaiementRequisNotice />
              )}
              {paymentRefused && <PaiementRequisNotice message={paymentRefused} tone="warn" />}

              {/* Quantité + indication */}
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className={labelCls}>Quantité</label>
                  <input
                    type="number"
                    min={1}
                    className={inputCls}
                    value={quantite}
                    onChange={(e) => setQuantite(Math.max(1, Number(e.target.value) || 1))}
                  />
                </div>
              </div>
              <div className="flex flex-col gap-1">
                <label className={labelCls}>Indication</label>
                <textarea
                  className={`${inputCls} resize-none`}
                  rows={2}
                  value={indication}
                  onChange={(e) => setIndication(e.target.value)}
                  placeholder="Motif de l'acte — ex : plaie du genou suite à une chute"
                />
              </div>
            </>
          ) : (
            <>
              <div className="rounded-xl bg-surface-container px-4 py-3">
                <p className="text-body-md font-semibold text-on-surface">{selected?.libelle}</p>
                {indication && (
                  <p className="text-body-sm text-on-surface-variant mt-0.5">{indication}</p>
                )}
              </div>
              <RealiserFields
                state={realiser}
                onChange={(p) => setRealiser((r) => ({ ...r, ...p }))}
              />
            </>
          )}

          {error && (
            <p className="text-body-sm text-error bg-error-container/40 rounded-xl px-4 py-3" role="alert">
              {error}
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="shrink-0 flex gap-3 pt-4 border-t border-outline-variant">
          {step === "form" ? (
            <>
              <button
                type="button"
                onClick={handlePrescrire}
                disabled={submitting || !selected}
                className="flex-1 inline-flex items-center justify-center gap-2 py-2 rounded-xl bg-primary text-on-primary text-body-md font-medium hover:bg-primary-container transition-colors disabled:opacity-50"
              >
                <PlaylistAddCheckOutlined style={{ fontSize: 18 }} />
                {submitting ? "…" : "Prescrire"}
              </button>
              {canPerform && (
                <button
                  type="button"
                  onClick={goRealiserStep}
                  disabled={submitting || !selected}
                  className="flex-1 inline-flex items-center justify-center gap-2 py-2 rounded-xl bg-secondary text-on-secondary text-body-md font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
                >
                  <BoltOutlined style={{ fontSize: 18 }} />
                  Prescrire et réaliser
                </button>
              )}
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={handlePrescrireEtRealiser}
                disabled={submitting}
                className="flex-1 inline-flex items-center justify-center gap-2 py-2 rounded-xl bg-secondary text-on-secondary text-body-md font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                <BoltOutlined style={{ fontSize: 18 }} />
                {submitting ? "Enregistrement…" : "Confirmer le geste"}
              </button>
              <button
                type="button"
                onClick={() => setStep("form")}
                disabled={submitting}
                className="px-4 py-2 rounded-xl text-body-md text-on-surface-variant border border-outline-variant hover:bg-surface-container transition-colors disabled:opacity-50 inline-flex items-center gap-1.5"
              >
                <ArrowBackOutlined style={{ fontSize: 16 }} />
                Retour
              </button>
            </>
          )}
        </div>
      </div>
  );

  if (bare) return inner;
  return (
    <RightDrawer title={title} onClose={onClose} width="w-[600px] max-w-full">
      {inner}
    </RightDrawer>
  );
}
