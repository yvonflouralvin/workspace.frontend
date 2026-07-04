"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { RightDrawer } from "@repo/ui/RightDrawer";
import { SearchSelect } from "@repo/ui/SearchSelect";
import { usePermissions } from "@repo/auth/hooks/usePermissions";
import {
  AddOutlined,
  DeleteOutlined,
  WarningAmberOutlined,
  ErrorOutlineOutlined,
  InfoOutlined,
  LockOutlined,
} from "@mui/icons-material";
import {
  createPrescription,
  deletePrescription,
  getPrescription,
  searchDrugs,
  checkAllergiesInstant,
  type AllergyCheckResult,
  type DrugSearchResult,
  type MedicationConflict,
  type PrescriptionRead,
} from "@/app/lib/prescriptions-api";
import {
  getPatientEncounters,
  createEncounter,
  type EncounterRead,
} from "@/app/lib/emr-api";

// ─── Constants ────────────────────────────────────────────────────────────────

const inputCls =
  "w-full rounded-xl border border-outline-variant bg-surface-container-lowest px-3 py-2 text-body-md text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:border-primary transition-colors";
const labelCls = "text-label-md font-medium text-on-surface-variant";

const SEVERITY_CLS: Record<string, string> = {
  CRITIQUE: "border-error bg-error-container text-error",
  SEVERE: "border-error bg-error-container text-error",
  MODEREE: "border-error/50 bg-error-container/60 text-error",
  LEGERE: "border-outline-variant bg-surface-container text-on-surface-variant",
};

const SEVERITY_LABEL: Record<string, string> = {
  CRITIQUE: "Critique",
  SEVERE: "Sévère",
  MODEREE: "Modérée",
  LEGERE: "Légère",
};

// ─── Types ────────────────────────────────────────────────────────────────────

interface PrescriptionLine {
  tempId: string;
  medicationId: number;
  medicationName: string;
  atcCode: string;
  atcLabel: string;
  dosage: string;
  frequency: string;
  route: string;
  duration: string;
  instructions: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function newLine(drug: DrugSearchResult): PrescriptionLine {
  return {
    tempId: `${drug.id}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    medicationId: drug.id,
    medicationName: drug.name,
    atcCode: drug.atc_code,
    atcLabel: drug.atc_label,
    dosage: "",
    frequency: "",
    route: "",
    duration: "",
    instructions: "",
  };
}

function drugLabel(d: DrugSearchResult): string {
  const parts = [d.name];
  if (d.form || d.strength) parts.push([d.form, d.strength].filter(Boolean).join(" "));
  parts.push(d.atc_code);
  return parts.join(" — ");
}

function conflictForLine(
  result: AllergyCheckResult | null,
  medicationId: number,
): MedicationConflict | null {
  if (!result) return null;
  return result.medications.find((m) => m.medication_id === medicationId && m.has_conflict) ?? null;
}

// ─── Allergy alert sub-component ─────────────────────────────────────────────

function AllergyLineAlert({ conflict }: { conflict: MedicationConflict }) {
  const highConf = conflict.conflicts.filter((c) => c.confidence === "HIGH");
  const lowConf = conflict.conflicts.filter((c) => c.confidence === "LOW");
  const topSeverity = conflict.highest_severity ?? "MODEREE";
  const isHigh = topSeverity === "CRITIQUE" || topSeverity === "SEVERE";

  return (
    <div
      className={`rounded-xl border px-3 py-2.5 text-body-sm mt-2 ${SEVERITY_CLS[topSeverity] ?? SEVERITY_CLS.MODEREE}`}
      role="alert"
    >
      <div className="flex items-start gap-2">
        {isHigh ? (
          <ErrorOutlineOutlined style={{ fontSize: 16 }} className="shrink-0 mt-0.5" />
        ) : (
          <WarningAmberOutlined style={{ fontSize: 16 }} className="shrink-0 mt-0.5" />
        )}
        <div className="flex-1 min-w-0 space-y-1">
          {highConf.map((c, i) => (
            <p key={i} className="font-medium">
              {c.message}
              <span className="ml-2 text-label-sm opacity-80">
                [{SEVERITY_LABEL[c.allergy_severity] ?? c.allergy_severity}]
              </span>
            </p>
          ))}
          {lowConf.map((c, i) => (
            <p key={i} className="opacity-80">
              <InfoOutlined style={{ fontSize: 13 }} className="inline mr-1 -mt-0.5" />
              {c.message}
              <span className="ml-1 text-label-sm italic opacity-70">
                — correspondance approximative (à confirmer)
              </span>
            </p>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── PrescriptionEditor ───────────────────────────────────────────────────────

export function PrescriptionEditor({
  patientId,
  encounterId: encounterIdProp,
  prescriptionId,
  onClose,
  onSaved,
}: {
  patientId: number;
  encounterId?: number;
  prescriptionId?: number;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { can } = usePermissions();
  const canWrite = can("hosto.prescriptions.create");

  const [lines, setLines] = useState<PrescriptionLine[]>([]);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const [allergyResult, setAllergyResult] = useState<AllergyCheckResult | null>(null);
  const [checkingAllergies, setCheckingAllergies] = useState(false);

  const [activeEncounter, setActiveEncounter] = useState<EncounterRead | null>(
    encounterIdProp ? ({ id: encounterIdProp } as EncounterRead) : null,
  );
  const [encounterLoading, setEncounterLoading] = useState(false);

  const [loadingPrescription, setLoadingPrescription] = useState(!!prescriptionId);
  const [loadError, setLoadError] = useState<string | null>(null);

  const allergyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prescriptionDeletedRef = useRef(false);
  const isEditing = !!prescriptionId;

  // ── Load existing prescription (edit mode) ────────────────────────────────

  useEffect(() => {
    if (!prescriptionId) return;
    setLoadingPrescription(true);
    getPrescription(prescriptionId)
      .then((prx: PrescriptionRead) => {
        setNotes(prx.notes ?? "");
        setLines(
          prx.items.map((item) => ({
            tempId: `existing-${item.id}`,
            medicationId: item.medication_id,
            medicationName: item.medication_name_cache,
            atcCode: "",
            atcLabel: "",
            dosage: item.dosage ?? "",
            frequency: item.frequency ?? "",
            route: item.route ?? "",
            duration: item.duration ?? "",
            instructions: item.instructions ?? "",
          })),
        );
        if (!encounterIdProp) {
          setActiveEncounter({ id: prx.encounter_id } as EncounterRead);
        }
      })
      .catch(() => setLoadError("Impossible de charger la prescription."))
      .finally(() => setLoadingPrescription(false));
  }, [prescriptionId, encounterIdProp]);

  // ── Encounter resolution ──────────────────────────────────────────────────

  async function resolveEncounter(): Promise<EncounterRead> {
    if (activeEncounter) return activeEncounter;
    if (encounterIdProp) {
      const enc = { id: encounterIdProp } as EncounterRead;
      setActiveEncounter(enc);
      return enc;
    }
    setEncounterLoading(true);
    try {
      const { items } = await getPatientEncounters(patientId, { per_page: 10 });
      const ongoing = items.find((e: EncounterRead) => e.status === "EN_COURS");
      if (ongoing) {
        setActiveEncounter(ongoing);
        return ongoing;
      }
      const created = await createEncounter({
        patient_id: patientId,
        type: "CONSULTATION",
        status: "EN_COURS",
      });
      setActiveEncounter(created);
      return created;
    } finally {
      setEncounterLoading(false);
    }
  }

  // ── Allergy check (debounced 600ms, standalone endpoint) ──────────────────

  const runAllergyCheck = useCallback(
    (currentLines: PrescriptionLine[]) => {
      if (allergyTimerRef.current) clearTimeout(allergyTimerRef.current);
      if (currentLines.length === 0) {
        setAllergyResult(null);
        return;
      }
      allergyTimerRef.current = setTimeout(async () => {
        setCheckingAllergies(true);
        try {
          const medIds = currentLines.map((l) => l.medicationId);
          const result = await checkAllergiesInstant(patientId, medIds);
          setAllergyResult(result);
        } catch {
          // silent — allergy check failure doesn't block save
        } finally {
          setCheckingAllergies(false);
        }
      }, 600);
    },
    [patientId],
  );

  useEffect(() => {
    runAllergyCheck(lines);
    return () => {
      if (allergyTimerRef.current) clearTimeout(allergyTimerRef.current);
    };
  }, [lines, runAllergyCheck]);

  // ── Add / remove lines ────────────────────────────────────────────────────

  function addDrug(_: string | number | null, drug: DrugSearchResult | null) {
    if (!drug) return;
    setLines((prev) => [...prev, newLine(drug)]);
  }

  function removeLine(tempId: string) {
    setLines((prev) => prev.filter((l) => l.tempId !== tempId));
  }

  function updateLine(tempId: string, key: keyof PrescriptionLine, value: string) {
    setLines((prev) =>
      prev.map((l) => (l.tempId === tempId ? { ...l, [key]: value } : l)),
    );
  }

  // ── Save draft ────────────────────────────────────────────────────────────

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (lines.length === 0) {
      setSaveError("Ajoutez au moins un médicament.");
      return;
    }
    setSaving(true);
    setSaveError(null);
    try {
      const enc = await resolveEncounter();
      if (isEditing && prescriptionId && !prescriptionDeletedRef.current) {
        await deletePrescription(prescriptionId);
        prescriptionDeletedRef.current = true;
      }
      await createPrescription({
        patient_id: patientId,
        encounter_id: enc.id,
        notes: notes.trim() || null,
        items: lines.map((l) => ({
          medication_id: l.medicationId,
          dosage: l.dosage.trim(),
          frequency: l.frequency.trim(),
          route: l.route.trim() || null,
          duration: l.duration.trim() || null,
          instructions: l.instructions.trim() || null,
        })),
      });
      onSaved();
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Erreur lors de l'enregistrement.");
    } finally {
      setSaving(false);
    }
  }

  // ── Derived state ─────────────────────────────────────────────────────────

  const totalConflicts = allergyResult?.medications.filter((m) => m.has_conflict).length ?? 0;
  const title = isEditing ? "Modifier la prescription" : "Nouvelle prescription";

  // ── Render ────────────────────────────────────────────────────────────────

  if (!canWrite) {
    return (
      <RightDrawer title={title} onClose={onClose} width="w-[800px] max-w-full">
        <div className="flex flex-col items-center gap-3 py-16 text-center">
          <LockOutlined style={{ fontSize: 32 }} className="text-on-surface-variant/30" />
          <p className="text-body-md text-on-surface-variant">
            Vous n&apos;avez pas la permission de créer des prescriptions.
          </p>
        </div>
      </RightDrawer>
    );
  }

  return (
    <RightDrawer title={title} onClose={onClose} width="w-[800px] max-w-full">
      {loadingPrescription ? (
        <div className="space-y-4 animate-pulse">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 rounded-xl bg-surface-container" />
          ))}
        </div>
      ) : loadError ? (
        <p className="text-body-sm text-error bg-error-container/40 rounded-xl px-4 py-3">
          {loadError}
        </p>
      ) : (
        <form onSubmit={handleSave} className="h-full flex flex-col gap-5 overflow-y-auto">
          <div className="flex-1 space-y-5 overflow-y-auto pr-1">

            {/* ── Récapitulatif allergie global ── */}
            {totalConflicts > 0 && (
              <div
                className="flex items-start gap-3 rounded-xl border border-error bg-error-container px-4 py-3"
                role="alert"
              >
                <ErrorOutlineOutlined
                  style={{ fontSize: 18 }}
                  className="text-error shrink-0 mt-0.5"
                />
                <div>
                  <p className="text-body-sm font-semibold text-error">
                    {totalConflicts} alerte{totalConflicts > 1 ? "s" : ""} d&apos;allergie détectée{totalConflicts > 1 ? "s" : ""}
                  </p>
                  <p className="text-body-sm text-error/80 mt-0.5">
                    Vérifiez les lignes concernées ci-dessous. La prescription peut être enregistrée comme brouillon.
                  </p>
                </div>
              </div>
            )}

            {checkingAllergies && lines.length > 0 && totalConflicts === 0 && (
              <div className="flex items-center gap-2 text-body-sm text-on-surface-variant">
                <span className="inline-block w-3 h-3 rounded-full bg-on-surface-variant/40 animate-pulse" />
                Vérification des allergies…
              </div>
            )}

            {/* ── Consultation ── */}
            {activeEncounter && (
              <p className="text-body-sm text-on-surface-variant">
                Consultation #{activeEncounter.id}
                {encounterLoading && " (chargement…)"}
              </p>
            )}
            {!activeEncounter && encounterLoading && (
              <p className="text-body-sm text-on-surface-variant">
                Détermination de la consultation en cours…
              </p>
            )}

            {/* ── Notes générales ── */}
            <div className="flex flex-col gap-1">
              <label className={labelCls}>Consignes générales</label>
              <textarea
                className={`${inputCls} resize-none`}
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Instructions générales pour cette prescription…"
              />
            </div>

            {/* ── Picker médicament ── */}
            <div>
              <p className={`${labelCls} mb-1.5`}>Ajouter un médicament</p>
              <SearchSelect<DrugSearchResult>
                fetchOptions={searchDrugs}
                value={null}
                onChange={addDrug}
                getOptionLabel={drugLabel}
                placeholder="Rechercher par nom, DCI ou code ATC…"
              />
            </div>

            {/* ── Lignes ── */}
            {lines.length > 0 && (
              <div className="space-y-4">
                <p className={labelCls}>
                  Médicaments ({lines.length})
                </p>
                {lines.map((line) => {
                  const conflict = conflictForLine(allergyResult, line.medicationId);
                  const hasConflict = !!conflict;

                  return (
                    <div
                      key={line.tempId}
                      className={`rounded-xl border p-4 transition-colors ${
                        hasConflict
                          ? "border-error/50 bg-error-container/10"
                          : "border-outline-variant bg-surface-container-lowest"
                      }`}
                    >
                      {/* Médicament header */}
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div className="flex-1 min-w-0">
                          <p className="text-body-md font-semibold text-on-surface truncate">
                            {line.medicationName}
                          </p>
                          {line.atcCode && (
                            <p className="text-body-sm text-on-surface-variant mt-0.5">
                              <span className="font-mono">{line.atcCode}</span>
                              {line.atcLabel && (
                                <span className="ml-2 text-on-surface-variant/70">
                                  — {line.atcLabel}
                                </span>
                              )}
                            </p>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => removeLine(line.tempId)}
                          title="Retirer ce médicament"
                          className="p-1.5 rounded-lg text-on-surface-variant hover:text-error hover:bg-error/8 transition-colors shrink-0"
                        >
                          <DeleteOutlined style={{ fontSize: 17 }} />
                        </button>
                      </div>

                      {/* Posologie */}
                      <div className="grid grid-cols-2 gap-3">
                        <div className="flex flex-col gap-1">
                          <label className={labelCls}>
                            Dosage <span className="text-error">*</span>
                          </label>
                          <input
                            className={inputCls}
                            value={line.dosage}
                            onChange={(e) => updateLine(line.tempId, "dosage", e.target.value)}
                            placeholder="Ex: 500 mg, 1 g…"
                          />
                        </div>
                        <div className="flex flex-col gap-1">
                          <label className={labelCls}>
                            Fréquence <span className="text-error">*</span>
                          </label>
                          <input
                            className={inputCls}
                            value={line.frequency}
                            onChange={(e) => updateLine(line.tempId, "frequency", e.target.value)}
                            placeholder="Ex: 3 fois/jour, matin…"
                          />
                        </div>
                        <div className="flex flex-col gap-1">
                          <label className={labelCls}>Voie</label>
                          <input
                            className={inputCls}
                            value={line.route}
                            onChange={(e) => updateLine(line.tempId, "route", e.target.value)}
                            placeholder="Ex: Orale, IV, SC…"
                          />
                        </div>
                        <div className="flex flex-col gap-1">
                          <label className={labelCls}>Durée</label>
                          <input
                            className={inputCls}
                            value={line.duration}
                            onChange={(e) => updateLine(line.tempId, "duration", e.target.value)}
                            placeholder="Ex: 7 jours, 1 mois…"
                          />
                        </div>
                        <div className="col-span-2 flex flex-col gap-1">
                          <label className={labelCls}>Instructions</label>
                          <input
                            className={inputCls}
                            value={line.instructions}
                            onChange={(e) =>
                              updateLine(line.tempId, "instructions", e.target.value)
                            }
                            placeholder="Ex: À prendre pendant le repas"
                          />
                        </div>
                      </div>

                      {/* Alerte allergie par ligne */}
                      {conflict && <AllergyLineAlert conflict={conflict} />}
                    </div>
                  );
                })}
              </div>
            )}

            {lines.length === 0 && (
              <div className="rounded-xl border border-dashed border-outline-variant px-6 py-8 flex flex-col items-center gap-2 text-center">
                <AddOutlined style={{ fontSize: 28 }} className="text-on-surface-variant/30" />
                <p className="text-body-sm text-on-surface-variant">
                  Utilisez le champ de recherche ci-dessus pour ajouter des médicaments.
                </p>
              </div>
            )}

            {saveError && (
              <p className="text-body-sm text-error bg-error-container/40 rounded-xl px-4 py-3">
                {saveError}
              </p>
            )}
          </div>

          {/* ── Footer ── */}
          <div className="shrink-0 flex gap-3 pt-4 border-t border-outline-variant">
            <button
              type="submit"
              disabled={saving || encounterLoading}
              className="flex-1 py-2 rounded-xl bg-primary text-on-primary text-body-md font-medium hover:bg-primary-container transition-colors disabled:opacity-50"
            >
              {saving
                ? "Enregistrement…"
                : isEditing
                  ? "Mettre à jour le brouillon"
                  : "Enregistrer le brouillon"}
            </button>
            <button
              type="button"
              disabled
              title="Signature disponible dans une prochaine version"
              className="px-5 py-2 rounded-xl text-body-md border border-outline-variant text-on-surface-variant opacity-40 cursor-not-allowed"
            >
              Signer
            </button>
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="px-5 py-2 rounded-xl text-body-md text-on-surface-variant border border-outline-variant hover:bg-surface-container transition-colors disabled:opacity-50"
            >
              Annuler
            </button>
          </div>
        </form>
      )}
    </RightDrawer>
  );
}
