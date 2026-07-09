"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { RightDrawer } from "@repo/ui/RightDrawer";
import { SearchSelect } from "@repo/ui/SearchSelect";
import { usePermissions } from "@repo/auth/hooks/usePermissions";
import {
  AddOutlined,
  CheckCircleOutlined,
  DeleteOutlined,
  ErrorOutlineOutlined,
  InfoOutlined,
  LockOutlined,
  PrintOutlined,
  WarningAmberOutlined,
} from "@mui/icons-material";
import {
  createPrescription,
  deletePrescription,
  downloadPrescriptionPdf,
  getPrescription,
  searchDrugs,
  signPrescription,
  updatePrescriptionItem,
  checkAllergiesInstant,
  SignBlockedError,
  SignAdminBlockedError,
  type AllergyCheckResult,
  type DrugSearchResult,
  type MedicationConflict,
  type PrescriptionRead,
} from "@/app/lib/prescriptions-api";
import {
  listSchemasAdministration,
  type SchemaAdministration,
} from "@/app/lib/schemas-admin-api";
import {
  getPatientEncounters,
  createEncounter,
  type EncounterRead,
} from "@/app/lib/emr-api";
import { ApiError } from "@/app/lib/api";

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
  // Suivi d'administration (H4a)
  suiviAdministration: boolean;
  doseQuantite: string;
  doseUnite: string;
  schemaId: number | null;
  horairesPerso: string[] | null; // null = utiliser les horaires du schéma
  dureeJours: string;
  dateDebut: string;
}

interface Override {
  enabled: boolean;
  reason: string;
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
    suiviAdministration: false,
    doseQuantite: "",
    doseUnite: "",
    schemaId: null,
    horairesPerso: null,
    dureeJours: "",
    dateDebut: "",
  };
}

// ─── Plan d'administration (aperçu) ────────────────────────────────────────────

function frDate(iso: string): string {
  const [y, m, d] = iso.split("-");
  if (!y || !m || !d) return iso;
  return `${d}/${m}/${y}`;
}

function addDaysIso(iso: string, days: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return iso;
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + days);
  return dt.toISOString().slice(0, 10);
}

function lineHoraires(line: PrescriptionLine, schemas: SchemaAdministration[]): string[] {
  if (line.horairesPerso && line.horairesPerso.length > 0) return line.horairesPerso;
  const schema = schemas.find((s) => s.id === line.schemaId);
  return schema?.horaires ?? [];
}

function planPreview(line: PrescriptionLine, schemas: SchemaAdministration[]): string | null {
  const horaires = lineHoraires(line, schemas);
  const duree = parseInt(line.dureeJours, 10);
  if (!horaires.length || !line.dateDebut || !Number.isFinite(duree) || duree < 1) return null;
  const nbDoses = horaires.length * duree;
  const fin = addDaysIso(line.dateDebut, duree - 1);
  return `${nbDoses} doses : du ${frDate(line.dateDebut)} au ${frDate(fin)}, à ${horaires.join(", ")}`;
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

// ─── AllergyLineAlert ─────────────────────────────────────────────────────────

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

// ─── AllergyOverrideSection ───────────────────────────────────────────────────

function AllergyOverrideSection({
  tempId,
  conflict,
  override,
  onToggle,
  onReasonChange,
}: {
  tempId: string;
  conflict: MedicationConflict;
  override: Override | undefined;
  onToggle: (tempId: string, enabled: boolean) => void;
  onReasonChange: (tempId: string, reason: string) => void;
}) {
  const isHigh = conflict.conflicts.some((c) => c.confidence === "HIGH");
  const reasonMissing = (override?.enabled ?? false) && !(override?.reason ?? "").trim();

  return (
    <div className="mt-3 rounded-xl border border-error/50 bg-error-container/20 p-3">
      <label className="flex items-start gap-2.5 cursor-pointer select-none">
        <input
          type="checkbox"
          className="mt-0.5 h-4 w-4 accent-error cursor-pointer"
          checked={override?.enabled ?? false}
          onChange={(e) => onToggle(tempId, e.target.checked)}
          aria-label="Prescrire malgré l'alerte allergie"
        />
        <span className="text-body-sm font-semibold text-error leading-snug">
          Prescrire malgré l&apos;alerte
          {isHigh ? (
            <span className="ml-1.5 font-normal text-error/80">
              — conflit ATC certain, justification médicale obligatoire
            </span>
          ) : (
            <span className="ml-1.5 font-normal text-error/80">
              — correspondance approximative, vérifier avant de forcer
            </span>
          )}
        </span>
      </label>

      {override?.enabled && (
        <div className="mt-2.5">
          <label className={`${labelCls} text-error/80 mb-1 block`}>
            Justification clinique <span className="text-error">*</span>
          </label>
          <textarea
            className={`${inputCls} resize-none border-error/50 focus:border-error text-body-sm`}
            rows={2}
            placeholder="Ex : bénéfice supérieur au risque allergique (historique résolu, désensibilisation…)"
            value={override.reason}
            onChange={(e) => onReasonChange(tempId, e.target.value)}
            autoFocus
          />
          {reasonMissing && (
            <p className="text-label-sm text-error mt-1" role="alert">
              La justification est obligatoire pour forcer une alerte d&apos;allergie.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

// ─── PosologyFields (H4a) — formulaire structuré unique ────────────────────────

function PosologyFields({
  line,
  schemas,
  onPatch,
}: {
  line: PrescriptionLine;
  schemas: SchemaAdministration[];
  onPatch: (tempId: string, patch: Partial<PrescriptionLine>) => void;
}) {
  const { tempId } = line;
  const selectedSchema = schemas.find((s) => s.id === line.schemaId) ?? null;
  const perso = line.horairesPerso;
  const dureeRequired = line.suiviAdministration;

  return (
    <div className="grid grid-cols-2 gap-3">
      <div className="flex flex-col gap-1">
        <label className={labelCls}>
          Dose <span className="text-error">*</span>
        </label>
        <input
          type="number"
          min={0}
          step="any"
          className={inputCls}
          value={line.doseQuantite}
          onChange={(e) => onPatch(tempId, { doseQuantite: e.target.value })}
          placeholder="Ex: 500"
        />
      </div>
      <div className="flex flex-col gap-1">
        <label className={labelCls}>Unité</label>
        <input
          className={inputCls}
          value={line.doseUnite}
          onChange={(e) => onPatch(tempId, { doseUnite: e.target.value })}
          placeholder="Ex: mg, comprimé…"
        />
      </div>

      <div className="col-span-2 flex flex-col gap-1">
        <label className={labelCls}>
          Rythme <span className="text-error">*</span>
        </label>
        <select
          className={inputCls}
          value={line.schemaId ?? ""}
          onChange={(e) => {
            const id = e.target.value ? Number(e.target.value) : null;
            onPatch(tempId, { schemaId: id, horairesPerso: null });
          }}
        >
          <option value="">— Choisir un rythme —</option>
          {schemas.map((s) => (
            <option key={s.id} value={s.id}>
              {s.nom} ({s.horaires.join(", ")})
            </option>
          ))}
        </select>
      </div>

      {selectedSchema && (
        <div className="col-span-2 flex flex-col gap-1.5">
          <div className="flex items-center justify-between gap-2">
            <label className={labelCls}>Horaires</label>
            {perso === null ? (
              <button
                type="button"
                className="text-label-sm text-tertiary hover:underline"
                onClick={() => onPatch(tempId, { horairesPerso: [...selectedSchema.horaires] })}
              >
                Personnaliser
              </button>
            ) : (
              <button
                type="button"
                className="text-label-sm text-on-surface-variant hover:underline"
                onClick={() => onPatch(tempId, { horairesPerso: null })}
              >
                Rétablir le rythme
              </button>
            )}
          </div>
          {perso === null ? (
            <p className="text-body-sm text-on-surface-variant">
              {selectedSchema.horaires.join(" · ")}{" "}
              <span className="text-label-sm">(du rythme)</span>
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {perso.map((h, i) => (
                <input
                  key={i}
                  type="time"
                  className="rounded-xl border border-outline-variant bg-surface-container-lowest px-2.5 py-1.5 text-body-sm text-on-surface focus:outline-none focus:border-primary"
                  value={h}
                  onChange={(e) =>
                    onPatch(tempId, {
                      horairesPerso: perso.map((x, j) => (j === i ? e.target.value : x)),
                    })
                  }
                />
              ))}
            </div>
          )}
        </div>
      )}

      <div className="flex flex-col gap-1">
        <label className={labelCls}>
          Durée (jours){dureeRequired && <span className="text-error"> *</span>}
        </label>
        <input
          type="number"
          min={1}
          className={inputCls}
          value={line.dureeJours}
          onChange={(e) => onPatch(tempId, { dureeJours: e.target.value })}
          placeholder="Ex: 7"
        />
      </div>
      <div className="flex flex-col gap-1">
        <label className={labelCls}>Voie</label>
        <input
          className={inputCls}
          value={line.route}
          onChange={(e) => onPatch(tempId, { route: e.target.value })}
          placeholder="Ex: Orale, IV, SC…"
        />
      </div>
      <div className="col-span-2 flex flex-col gap-1">
        <label className={labelCls}>Instructions</label>
        <input
          className={inputCls}
          value={line.instructions}
          onChange={(e) => onPatch(tempId, { instructions: e.target.value })}
          placeholder="Ex: À prendre pendant le repas"
        />
      </div>
    </div>
  );
}

// ─── Suivi d'administration (H4a) ──────────────────────────────────────────────

function SuiviSection({
  line,
  schemas,
  onPatch,
}: {
  line: PrescriptionLine;
  schemas: SchemaAdministration[];
  onPatch: (tempId: string, patch: Partial<PrescriptionLine>) => void;
}) {
  const { tempId } = line;
  const preview = planPreview(line, schemas);

  return (
    <div className="mt-3 rounded-xl border border-tertiary/30 bg-tertiary/5 p-3">
      <label className="flex items-center gap-2.5 cursor-pointer select-none">
        <input
          type="checkbox"
          className="h-4 w-4 accent-tertiary cursor-pointer"
          checked={line.suiviAdministration}
          onChange={(e) => onPatch(tempId, { suiviAdministration: e.target.checked })}
        />
        <span className="text-body-sm font-semibold text-tertiary">
          Suivi d&apos;administration
        </span>
        <span className="text-label-sm font-normal text-on-surface-variant">
          — tracer chaque prise (patient hospitalisé)
        </span>
      </label>

      {line.suiviAdministration && (
        <div className="mt-3 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <label className={labelCls}>
                Date de début <span className="text-error">*</span>
              </label>
              <input
                type="date"
                className={inputCls}
                value={line.dateDebut}
                onChange={(e) => onPatch(tempId, { dateDebut: e.target.value })}
              />
            </div>
          </div>

          {preview ? (
            <div className="rounded-xl bg-tertiary/10 px-3 py-2 text-body-sm text-tertiary">
              {preview}
            </div>
          ) : (
            <p className="text-label-sm text-on-surface-variant">
              Renseignez dose, rythme, durée et date de début pour visualiser le plan.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

// ─── SignedView ───────────────────────────────────────────────────────────────

function SignedView({
  prx,
  onClose,
  bare,
}: {
  prx: PrescriptionRead;
  onClose: () => void;
  bare?: boolean;
}) {
  const [downloading, setDownloading] = useState(false);
  const [pdfError, setPdfError] = useState<string | null>(null);

  async function handlePdf() {
    setDownloading(true);
    setPdfError(null);
    try {
      await downloadPrescriptionPdf(prx.id);
    } catch {
      setPdfError("Impossible de générer l'ordonnance. Le service de documents est peut-être indisponible.");
    } finally {
      setDownloading(false);
    }
  }

  const signedAt = prx.signed_at
    ? new Date(prx.signed_at).toLocaleDateString("fr-FR", {
        day: "numeric",
        month: "long",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : null;

  const signedContent = (
    <div className="h-full overflow-y-auto space-y-5 pr-1">
      {/* Succès */}
        <div className="flex items-start gap-3 rounded-xl border border-secondary/40 bg-secondary/8 px-4 py-3">
          <CheckCircleOutlined className="text-secondary shrink-0 mt-0.5" style={{ fontSize: 20 }} />
          <div>
            <p className="text-body-sm font-semibold text-secondary">Prescription signée avec succès</p>
            <p className="text-body-sm text-on-surface-variant mt-0.5">
              Cette prescription est immuable — elle ne peut plus être modifiée.
              {signedAt && <span className="block mt-0.5 text-label-sm">Signée le {signedAt}</span>}
            </p>
          </div>
        </div>

        {/* PDF */}
        <button
          type="button"
          onClick={handlePdf}
          disabled={downloading}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-secondary text-on-secondary text-body-md font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          <PrintOutlined style={{ fontSize: 18 }} />
          {downloading ? "Génération du PDF…" : "Imprimer / Télécharger l'ordonnance"}
        </button>

        {pdfError && (
          <p className="text-body-sm text-error bg-error-container/40 rounded-xl px-4 py-3" role="alert">
            {pdfError}
          </p>
        )}

        {/* Médicaments */}
        <div>
          <p className="text-label-md font-medium text-on-surface-variant mb-2 uppercase tracking-wide">
            Médicaments ({prx.items.length})
          </p>
          <div className="rounded-xl border border-outline-variant overflow-hidden divide-y divide-outline-variant">
            {prx.items.map((item) => (
              <div key={item.id} className="px-4 py-3 bg-surface-container-lowest">
                <p className="text-body-md font-semibold text-on-surface">{item.medication_name_cache}</p>
                <p className="text-body-sm text-on-surface-variant mt-0.5">
                  {[item.dosage, item.frequency, item.route].filter(Boolean).join(" · ")}
                  {item.duration && <span className="ml-2 text-on-surface-variant/70">· {item.duration}</span>}
                </p>
                {item.instructions && (
                  <p className="text-body-sm text-on-surface-variant/70 italic mt-0.5">{item.instructions}</p>
                )}
                {item.allergy_overridden && (
                  <span className="inline-flex items-center gap-1 mt-1.5 text-label-sm px-2 py-0.5 rounded-full bg-error-container text-error font-medium">
                    <LockOutlined style={{ fontSize: 12 }} />
                    Prescrit malgré une alerte allergie
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>

        {prx.notes && (
          <div className="rounded-xl bg-surface-container px-4 py-3">
            <p className="text-label-sm font-medium text-on-surface-variant mb-1">Consignes générales</p>
            <p className="text-body-sm text-on-surface">{prx.notes}</p>
          </div>
        )}

        <button
          type="button"
          onClick={onClose}
          className="w-full py-2 rounded-xl border border-outline-variant text-body-md text-on-surface-variant hover:bg-surface-container transition-colors"
        >
          Fermer
        </button>
      </div>
  );

  if (bare) return signedContent;
  return (
    <RightDrawer title="Prescription signée" onClose={onClose} width="w-[800px] max-w-full">
      {signedContent}
    </RightDrawer>
  );
}

// ─── PrescriptionEditor ───────────────────────────────────────────────────────

export function PrescriptionEditor({
  patientId,
  encounterId: encounterIdProp,
  prescriptionId,
  onClose,
  onSaved,
  bare = false,
}: {
  patientId: number;
  encounterId?: number;
  prescriptionId?: number;
  onClose: () => void;
  onSaved: () => void;
  bare?: boolean;
}) {
  const { can } = usePermissions();
  const canWrite = can("hosto.prescriptions.create");

  const [lines, setLines] = useState<PrescriptionLine[]>([]);
  const [notes, setNotes] = useState("");
  const [overrides, setOverrides] = useState<Record<string, Override>>({});
  const [schemas, setSchemas] = useState<SchemaAdministration[]>([]);

  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const [signModalOpen, setSignModalOpen] = useState(false);
  const [signing, setSigning] = useState(false);
  const [signError, setSignError] = useState<string | null>(null);
  const [signedPrx, setSignedPrx] = useState<PrescriptionRead | null>(null);

  const [allergyResult, setAllergyResult] = useState<AllergyCheckResult | null>(null);
  const [checkingAllergies, setCheckingAllergies] = useState(false);

  const [activeEncounter, setActiveEncounter] = useState<EncounterRead | null>(
    encounterIdProp ? ({ id: encounterIdProp } as EncounterRead) : null,
  );
  const [encounterLoading, setEncounterLoading] = useState(false);

  const [loadingPrescription, setLoadingPrescription] = useState(!!prescriptionId);
  const [loadError, setLoadError] = useState<string | null>(null);

  const allergyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // tracks the current brouillon in DB that needs to be deleted on next save/sign
  const prxToDeleteRef = useRef<number | undefined>(prescriptionId);
  const isEditing = !!prescriptionId;

  // ── Load existing prescription ────────────────────────────────────────────

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
            suiviAdministration: item.suivi_administration ?? false,
            doseQuantite: item.dose_quantite != null ? String(item.dose_quantite) : "",
            doseUnite: item.dose_unite ?? "",
            schemaId: item.schema_id ?? null,
            horairesPerso: item.horaires_personnalises ?? null,
            dureeJours: item.duree_jours != null ? String(item.duree_jours) : "",
            dateDebut: item.date_debut ?? "",
          })),
        );
        if (!encounterIdProp) {
          setActiveEncounter({ id: prx.encounter_id } as EncounterRead);
        }
      })
      .catch(() => setLoadError("Impossible de charger la prescription."))
      .finally(() => setLoadingPrescription(false));
  }, [prescriptionId, encounterIdProp]);

  // ── Load schémas d'administration (H4a) ───────────────────────────────────
  useEffect(() => {
    listSchemasAdministration().then(setSchemas).catch(() => {});
  }, []);

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

  // ── Allergy check (debounced 600ms) ───────────────────────────────────────

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
          // silent — allergy check failure doesn't block save/sign
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

  // ── Add / remove / update lines ───────────────────────────────────────────

  function addDrug(_: string | number | null, drug: DrugSearchResult | null) {
    if (!drug) return;
    setLines((prev) => [...prev, newLine(drug)]);
  }

  function removeLine(tempId: string) {
    setLines((prev) => prev.filter((l) => l.tempId !== tempId));
    setOverrides((prev) => {
      const next = { ...prev };
      delete next[tempId];
      return next;
    });
  }

  function patchLine(tempId: string, patch: Partial<PrescriptionLine>) {
    setLines((prev) =>
      prev.map((l) => (l.tempId === tempId ? { ...l, ...patch } : l)),
    );
  }

  function setOverrideEnabled(tempId: string, enabled: boolean) {
    setOverrides((prev) => ({
      ...prev,
      [tempId]: { enabled, reason: prev[tempId]?.reason ?? "" },
    }));
  }

  function setOverrideReason(tempId: string, reason: string) {
    setOverrides((prev) => ({
      ...prev,
      [tempId]: { enabled: prev[tempId]?.enabled ?? false, reason },
    }));
  }

  // ── Build items payload ───────────────────────────────────────────────────

  // Le formulaire est structuré ; on dérive les chaînes texte (dosage/frequency/
  // duration) uniquement pour l'ordonnance PDF, qui reste inchangée côté backend.
  function buildItems() {
    return lines.map((l) => {
      const horaires = lineHoraires(l, schemas);
      const doseNum = parseFloat(l.doseQuantite);
      const dureeNum = parseInt(l.dureeJours, 10);
      const doseStr = [l.doseQuantite.trim(), l.doseUnite.trim()].filter(Boolean).join(" ");
      const frequencyStr = horaires.length
        ? `${horaires.length}x/jour — ${horaires.join(", ")}`
        : "";
      const durationStr =
        Number.isFinite(dureeNum) && dureeNum > 0
          ? `${dureeNum} jour${dureeNum > 1 ? "s" : ""}`
          : null;
      return {
        medication_id: l.medicationId,
        dosage: doseStr,
        frequency: frequencyStr,
        route: l.route.trim() || null,
        duration: durationStr,
        instructions: l.instructions.trim() || null,
        dose_quantite: Number.isFinite(doseNum) ? doseNum : null,
        dose_unite: l.doseUnite.trim() || null,
        duree_jours: Number.isFinite(dureeNum) ? dureeNum : null,
        schema_id: l.schemaId,
        horaires_personnalises: l.horairesPerso,
        suivi_administration: l.suiviAdministration,
        mode_administration: l.suiviAdministration ? "PERSONNEL" : null,
        date_debut: l.suiviAdministration ? l.dateDebut || null : null,
      };
    });
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  async function safeDelete(id: number) {
    try {
      await deletePrescription(id);
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) return;
      throw err;
    }
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
      if (prxToDeleteRef.current) {
        await safeDelete(prxToDeleteRef.current);
        prxToDeleteRef.current = undefined;
      }
      const prx = await createPrescription({
        patient_id: patientId,
        encounter_id: enc.id,
        notes: notes.trim() || null,
        items: buildItems(),
      });
      prxToDeleteRef.current = prx.id;
      onSaved();
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Erreur lors de l'enregistrement.");
    } finally {
      setSaving(false);
    }
  }

  // ── Sign ──────────────────────────────────────────────────────────────────

  async function handleSign() {
    if (lines.length === 0) {
      setSignError("Ajoutez au moins un médicament avant de signer.");
      return;
    }
    setSigning(true);
    setSignError(null);
    let freshPrxId: number | undefined;
    try {
      const enc = await resolveEncounter();

      if (prxToDeleteRef.current) {
        await safeDelete(prxToDeleteRef.current);
        prxToDeleteRef.current = undefined;
      }

      const freshPrx = await createPrescription({
        patient_id: patientId,
        encounter_id: enc.id,
        notes: notes.trim() || null,
        items: buildItems(),
      });
      freshPrxId = freshPrx.id;

      // Apply overrides for items with detected conflicts (in order, by index)
      const conflictedMedIds = new Set(
        allergyResult?.medications.filter((m) => m.has_conflict).map((m) => m.medication_id) ?? [],
      );
      for (let i = 0; i < freshPrx.items.length; i++) {
        const item = freshPrx.items[i];
        const line = lines[i];
        if (!line || !conflictedMedIds.has(item.medication_id)) continue;
        const ov = overrides[line.tempId];
        if (ov?.enabled && ov.reason.trim()) {
          await updatePrescriptionItem(freshPrx.id, item.id, {
            allergy_overridden: true,
            override_reason: ov.reason.trim(),
          });
        }
      }

      const signed = await signPrescription(freshPrx.id);
      setSignedPrx(signed);
      setSignModalOpen(false);
    } catch (err) {
      // Clean up fresh prescription if sign failed
      if (freshPrxId !== undefined) {
        await deletePrescription(freshPrxId).catch(() => {});
      }
      if (err instanceof SignBlockedError) {
        setSignError(
          `Justification manquante pour : ${err.blockingMedications.join(", ")}. Cochez et remplissez la justification pour ces médicaments.`,
        );
      } else if (err instanceof SignAdminBlockedError) {
        setSignError(
          `Données de suivi d'administration incomplètes pour : ${err.blockingAdministration.join(", ")}. Renseignez la dose, le rythme, la durée et la date de début pour ces médicaments.`,
        );
      } else {
        setSignError(err instanceof Error ? err.message : "Erreur lors de la signature.");
      }
    } finally {
      setSigning(false);
    }
  }

  // ── Derived ───────────────────────────────────────────────────────────────

  const totalConflicts = allergyResult?.medications.filter((m) => m.has_conflict).length ?? 0;
  const conflictsWithValidOverride = lines.filter((l) => {
    const conflict = conflictForLine(allergyResult, l.medicationId);
    if (!conflict) return false;
    const ov = overrides[l.tempId];
    return ov?.enabled && ov.reason.trim();
  }).length;
  const conflictsWithoutOverride = totalConflicts - conflictsWithValidOverride;

  const title = isEditing ? "Modifier la prescription" : "Nouvelle prescription";

  // ── Signed view ───────────────────────────────────────────────────────────

  if (signedPrx) {
    return <SignedView prx={signedPrx} onClose={onSaved} bare={bare} />;
  }

  // ── Permission guard ──────────────────────────────────────────────────────

  if (!canWrite) {
    const guardContent = (
      <div className="flex flex-col items-center gap-3 py-16 text-center">
        <LockOutlined style={{ fontSize: 32 }} className="text-on-surface-variant/30" />
        <p className="text-body-md text-on-surface-variant">
          Vous n&apos;avez pas la permission de créer des prescriptions.
        </p>
      </div>
    );
    if (bare) return guardContent;
    return (
      <RightDrawer title={title} onClose={onClose} width="w-[800px] max-w-full">
        {guardContent}
      </RightDrawer>
    );
  }

  // ── Main editor ───────────────────────────────────────────────────────────

  const editorFormContent = loadingPrescription ? (
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

              {/* ── Alerte globale allergie ── */}
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
                      {conflictsWithoutOverride > 0
                        ? "Retirez les médicaments concernés ou forcez avec justification avant de signer."
                        : "Tous les conflits ont été justifiés — la signature est possible."}
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

              {/* ── Lignes médicaments ── */}
              {lines.length > 0 && (
                <div className="space-y-4">
                  <p className={labelCls}>Médicaments ({lines.length})</p>
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
                        {/* Header médicament */}
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

                        {/* Posologie structurée (H4a) */}
                        <PosologyFields line={line} schemas={schemas} onPatch={patchLine} />

                        {/* Alerte allergie + forçage */}
                        {conflict && (
                          <>
                            <AllergyLineAlert conflict={conflict} />
                            <AllergyOverrideSection
                              tempId={line.tempId}
                              conflict={conflict}
                              override={overrides[line.tempId]}
                              onToggle={setOverrideEnabled}
                              onReasonChange={setOverrideReason}
                            />
                          </>
                        )}

                        {/* Suivi d'administration (H4a) */}
                        <SuiviSection line={line} schemas={schemas} onPatch={patchLine} />
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
                <p className="text-body-sm text-error bg-error-container/40 rounded-xl px-4 py-3" role="alert">
                  {saveError}
                </p>
              )}
            </div>

            {/* ── Footer ── */}
            <div className="shrink-0 flex gap-3 pt-4 border-t border-outline-variant">
              <button
                type="submit"
                disabled={saving || signing || encounterLoading}
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
                onClick={() => {
                  setSaveError(null);
                  setSignError(null);
                  setSignModalOpen(true);
                }}
                disabled={saving || signing || encounterLoading || lines.length === 0}
                className="px-5 py-2 rounded-xl text-body-md bg-secondary text-on-secondary hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                Signer
              </button>
              <button
                type="button"
                onClick={onClose}
                disabled={saving || signing}
                className="px-5 py-2 rounded-xl text-body-md text-on-surface-variant border border-outline-variant hover:bg-surface-container transition-colors disabled:opacity-50"
              >
                Annuler
              </button>
            </div>
          </form>
        );

  return (
    <>
      {bare ? (
        <div className="h-full flex flex-col overflow-hidden">
          {editorFormContent}
        </div>
      ) : (
        <RightDrawer title={title} onClose={onClose} width="w-[800px] max-w-full">
          {editorFormContent}
        </RightDrawer>
      )}

      {/* ── Modal confirmation signature ── */}
      {signModalOpen && typeof document !== "undefined" && createPortal(
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60">
          <div className="bg-surface rounded-2xl shadow-2xl p-6 w-full max-w-[448px]">
            <div className="flex items-start gap-3 mb-4">
              <LockOutlined className="text-secondary shrink-0 mt-0.5" style={{ fontSize: 22 }} />
              <div>
                <h2 className="text-title-sm font-semibold text-on-surface">
                  Confirmer la signature
                </h2>
                <p className="text-body-sm text-on-surface-variant mt-1">
                  Une fois signée, la prescription{" "}
                  <strong>ne pourra plus être modifiée</strong>. Elle sera immuable.
                </p>
              </div>
            </div>

            <div className="rounded-xl bg-surface-container px-4 py-3 space-y-1.5 mb-4 text-body-sm">
              <p className="text-on-surface">
                <span className="font-medium">{lines.length}</span> médicament{lines.length > 1 ? "s" : ""}
              </p>
              {totalConflicts > 0 && conflictsWithoutOverride > 0 && (
                <p className="text-error font-medium">
                  ⚠ {conflictsWithoutOverride} conflit{conflictsWithoutOverride > 1 ? "s" : ""}{" "}
                  allergique{conflictsWithoutOverride > 1 ? "s" : ""} sans justification — la
                  signature sera refusée par le serveur.
                </p>
              )}
              {totalConflicts > 0 && conflictsWithoutOverride === 0 && (
                <p className="text-on-surface-variant">
                  {conflictsWithValidOverride} conflit{conflictsWithValidOverride > 1 ? "s" : ""}{" "}
                  forcé{conflictsWithValidOverride > 1 ? "s" : ""} avec justification.
                </p>
              )}
            </div>

            {signError && (
              <div
                className="rounded-xl border border-error bg-error-container/40 px-4 py-3 mb-4 text-body-sm text-error"
                role="alert"
              >
                {signError}
              </div>
            )}

            <div className="flex gap-3 justify-end">
              <button
                type="button"
                onClick={() => {
                  setSignModalOpen(false);
                  setSignError(null);
                }}
                disabled={signing}
                className="px-4 py-2 rounded-xl text-body-md text-on-surface-variant border border-outline-variant hover:bg-surface-container transition-colors disabled:opacity-50"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleSign}
                disabled={signing}
                className="px-4 py-2 rounded-xl text-body-md bg-secondary text-on-secondary hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {signing ? "Signature en cours…" : "Confirmer la signature"}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
