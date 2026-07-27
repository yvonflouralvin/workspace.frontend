"use client";

import { useCallback, useEffect, useState } from "react";
import { Modal } from "@repo/ui/Modal";
import { RightDrawer } from "@repo/ui/RightDrawer";
import { LineChart, type LineChartSeries } from "@repo/ui/charts/LineChart";
import { AddOutlined, DeleteOutlined, FavoriteBorderOutlined } from "@mui/icons-material";
import {
  createObservationsBatch,
  deleteObservation,
  getLatestObservations,
  getPatientObservations,
  type ObservationBatchItem,
  type ObservationCode,
  type ObservationRead,
} from "@/app/lib/emr-api";
import {
  BOUNDS,
  computeIMC,
  isAbnormal,
  NORMAL,
  UNITS,
  validateField,
} from "@/components/emr/vitals-utils";

const LABELS: Record<ObservationCode | "TA", string> = {
  TEMPERATURE: "Température",
  TA_SYSTOLIQUE: "TA systolique",
  TA_DIASTOLIQUE: "TA diastolique",
  TA: "Tension artérielle",
  FC: "Fréq. cardiaque",
  FR: "Fréq. respiratoire",
  SPO2: "SpO₂",
  POIDS: "Poids",
  TAILLE: "Taille",
  IMC: "IMC",
  DOULEUR_EVA: "Douleur (EVA)",
};

// Codes available in the batch form (IMC excluded — computed from poids+taille)
const FORM_CODES: ObservationCode[] = [
  "TEMPERATURE", "TA_SYSTOLIQUE", "TA_DIASTOLIQUE", "FC", "FR", "SPO2", "POIDS", "TAILLE", "DOULEUR_EVA",
];

type ChartGroup = { key: string; title: string; codes: ObservationCode[] };

const CHART_GROUPS: ChartGroup[] = [
  { key: "TEMPERATURE", title: "Température", codes: ["TEMPERATURE"] },
  { key: "TA", title: "Tension artérielle", codes: ["TA_SYSTOLIQUE", "TA_DIASTOLIQUE"] },
  { key: "FC", title: "Fréq. cardiaque", codes: ["FC"] },
  { key: "FR", title: "Fréq. respiratoire", codes: ["FR"] },
  { key: "SPO2", title: "SpO₂", codes: ["SPO2"] },
  { key: "POIDS", title: "Poids", codes: ["POIDS"] },
  { key: "TAILLE", title: "Taille", codes: ["TAILLE"] },
  { key: "DOULEUR_EVA", title: "Douleur (EVA)", codes: ["DOULEUR_EVA"] },
];

type Range = "7j" | "30j" | "all";
type SeriesMap = Partial<Record<ObservationCode, ObservationRead[]>>;
type FormValues = Partial<Record<ObservationCode, string>>;

// ─── Helpers ─────────────────────────────────────────────────────────────────

const inputCls =
  "w-full rounded-xl border border-outline-variant bg-surface-container-lowest px-3 py-2 text-body-md text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:border-primary transition-colors";
const labelCls = "text-label-md font-medium text-on-surface-variant";

function fmtShort(iso: string): string {
  return new Date(iso).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function nowLocal(): string {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
}

function rangeFrom(range: Range): string | undefined {
  if (range === "all") return undefined;
  const d = new Date();
  d.setDate(d.getDate() - (range === "7j" ? 7 : 30));
  return d.toISOString();
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function LatestSkeleton() {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
      {Array.from({ length: 8 }).map((_, i) => (
        <div
          key={i}
          className="rounded-2xl border border-outline-variant bg-surface-container-lowest px-4 py-3 space-y-2"
          aria-busy
        >
          <div className="h-3 w-24 rounded bg-surface-container animate-pulse" />
          <div className="h-7 w-16 rounded bg-surface-container animate-pulse" />
          <div className="h-3 w-20 rounded bg-surface-container animate-pulse" />
        </div>
      ))}
    </div>
  );
}

function ChartSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div
          key={i}
          className="rounded-2xl border border-outline-variant bg-surface-container-lowest p-4 space-y-2"
          aria-busy
        >
          <div className="h-3 w-28 rounded bg-surface-container animate-pulse" />
          <div className="h-[140px] rounded-xl bg-surface-container animate-pulse" />
        </div>
      ))}
    </div>
  );
}

interface VignetteCardProps {
  label: string;
  value: string;
  unit: string;
  date?: string;
  abnormal?: boolean;
  estimated?: boolean;
  obs?: ObservationRead;
  canWrite: boolean;
  onDelete?: (obs: ObservationRead) => void;
}

function VignetteCard({
  label, value, unit, date, abnormal, estimated, obs, canWrite, onDelete,
}: VignetteCardProps) {
  return (
    <div
      className={`group relative rounded-2xl border px-4 py-3 transition-colors ${
        abnormal
          ? "border-error/40 bg-error-container/20"
          : "border-outline-variant bg-surface-container-lowest"
      }`}
    >
      <p className="text-label-sm text-on-surface-variant truncate">{label}</p>
      <p className={`text-headline-sm font-display mt-0.5 leading-tight ${abnormal ? "text-error" : "text-on-surface"}`}>
        {value}
        <span className="text-body-sm font-normal ml-1 text-on-surface-variant">{unit}</span>
      </p>
      {(date || estimated) && (
        <p className="text-label-sm text-on-surface-variant/60 mt-0.5 truncate">
          {estimated ? "estimé (poids + taille)" : date}
        </p>
      )}
      {canWrite && obs && onDelete && (
        <button
          type="button"
          onClick={() => onDelete(obs)}
          title="Supprimer cette mesure"
          className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 focus:opacity-100 p-1 rounded-lg text-on-surface-variant/50 hover:text-error hover:bg-error/8 transition-all"
        >
          <DeleteOutlined style={{ fontSize: 15 }} />
        </button>
      )}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

// ─── Form batch (autonome — réutilisé en RightDrawer ET dans le SplitWorkspace) ─

function VitalsForm({
  patientId,
  encounterId,
  onSaved,
  onClose,
}: {
  patientId: number;
  encounterId?: number;
  onSaved: () => void;
  onClose: () => void;
}) {
  const [formValues, setFormValues] = useState<FormValues>({});
  const [measuredAt, setMeasuredAt] = useState(nowLocal());
  const [formErrors, setFormErrors] = useState<Partial<Record<ObservationCode, string>>>({});
  const [formGlobalError, setFormGlobalError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function setField(code: ObservationCode, value: string) {
    setFormValues((f) => ({ ...f, [code]: value }));
    const warn = validateField(code, value);
    setFormErrors((e) => ({ ...e, [code]: warn ?? undefined }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const observations: ObservationBatchItem[] = [];
    for (const code of FORM_CODES) {
      const raw = formValues[code]?.trim();
      if (!raw) continue;
      const v = parseFloat(raw);
      if (isNaN(v)) {
        setFormGlobalError(`Valeur invalide pour ${LABELS[code]}.`);
        return;
      }
      observations.push({
        patient_id: patientId,
        code,
        value: v,
        unit: UNITS[code],
        measured_at: new Date(measuredAt).toISOString(),
        ...(encounterId !== undefined ? { encounter_id: encounterId } : {}),
      });
    }
    if (observations.length === 0) {
      setFormGlobalError("Renseignez au moins une constante.");
      return;
    }
    setSaving(true);
    setFormGlobalError(null);
    try {
      await createObservationsBatch(observations);
      onSaved();
    } catch (err) {
      setFormGlobalError(err instanceof Error ? err.message : "Erreur lors de l'enregistrement.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="h-full flex flex-col gap-5 overflow-y-auto">
      <div className="flex-1 space-y-4 overflow-y-auto pr-1">
        <div className="flex flex-col gap-1">
          <label className={labelCls}>
            Date et heure <span className="text-error">*</span>
          </label>
          <input
            type="datetime-local"
            className={inputCls}
            value={measuredAt}
            onChange={(e) => setMeasuredAt(e.target.value)}
            required
          />
        </div>

        <hr className="border-outline-variant" />

        <VitalField code="TEMPERATURE" label="Température" value={formValues.TEMPERATURE ?? ""} onChange={(v) => setField("TEMPERATURE", v)} warn={formErrors.TEMPERATURE} />

        <div className="grid grid-cols-2 gap-3">
          <VitalField code="TA_SYSTOLIQUE" label="TA systolique" value={formValues.TA_SYSTOLIQUE ?? ""} onChange={(v) => setField("TA_SYSTOLIQUE", v)} warn={formErrors.TA_SYSTOLIQUE} />
          <VitalField code="TA_DIASTOLIQUE" label="TA diastolique" value={formValues.TA_DIASTOLIQUE ?? ""} onChange={(v) => setField("TA_DIASTOLIQUE", v)} warn={formErrors.TA_DIASTOLIQUE} />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <VitalField code="FC" label="Fréq. cardiaque" value={formValues.FC ?? ""} onChange={(v) => setField("FC", v)} warn={formErrors.FC} />
          <VitalField code="FR" label="Fréq. respiratoire" value={formValues.FR ?? ""} onChange={(v) => setField("FR", v)} warn={formErrors.FR} />
        </div>

        <VitalField code="SPO2" label="SpO₂" value={formValues.SPO2 ?? ""} onChange={(v) => setField("SPO2", v)} warn={formErrors.SPO2} />

        <div className="grid grid-cols-2 gap-3">
          <VitalField code="POIDS" label="Poids" value={formValues.POIDS ?? ""} onChange={(v) => setField("POIDS", v)} warn={formErrors.POIDS} />
          <VitalField code="TAILLE" label="Taille" value={formValues.TAILLE ?? ""} onChange={(v) => setField("TAILLE", v)} warn={formErrors.TAILLE} />
        </div>

        {(() => {
          const p = parseFloat(formValues.POIDS ?? "");
          const t = parseFloat(formValues.TAILLE ?? "");
          if (isNaN(p) || isNaN(t) || t <= 0) return null;
          const tM = t / 100;
          const preview = Math.round((p / (tM * tM)) * 10) / 10;
          return (
            <p className="text-body-sm text-on-surface-variant bg-surface-container rounded-xl px-3 py-2">
              IMC estimé : <strong>{preview} kg/m²</strong>
            </p>
          );
        })()}

        <VitalField code="DOULEUR_EVA" label="Douleur (EVA)" value={formValues.DOULEUR_EVA ?? ""} onChange={(v) => setField("DOULEUR_EVA", v)} warn={formErrors.DOULEUR_EVA} />

        <p className="text-label-sm text-on-surface-variant/60">
          Tous les champs sont optionnels — renseignez ceux mesurés. L&apos;IMC est calculé automatiquement.
        </p>

        {formGlobalError && (
          <p className="text-body-sm text-error bg-error-container/40 rounded-xl px-3 py-2">{formGlobalError}</p>
        )}
      </div>

      <div className="shrink-0 flex gap-3 pt-4 border-t border-outline-variant">
        <button
          type="submit"
          disabled={saving}
          className="flex-1 py-2 rounded-xl bg-primary text-on-primary text-body-md font-medium hover:bg-primary-container transition-colors disabled:opacity-50"
        >
          {saving ? "Enregistrement…" : "Enregistrer"}
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
  );
}

export function VitalsTab({
  patientId,
  canWrite,
  onMutation,
  encounterId,
  onSplit,
  onCloseSplit,
}: {
  patientId: number;
  canWrite: boolean;
  onMutation?: () => void;
  encounterId?: number;
  onSplit?: (title: string, content: React.ReactNode) => void;
  onCloseSplit?: () => void;
}) {
  const [latest, setLatest] = useState<ObservationRead[]>([]);
  const [series, setSeries] = useState<SeriesMap>({});
  const [range, setRange] = useState<Range>("30j");

  const [loadingLatest, setLoadingLatest] = useState(true);
  const [loadingCharts, setLoadingCharts] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [valuesGroup, setValuesGroup] = useState<ChartGroup | null>(null);

  const [deleteTarget, setDeleteTarget] = useState<ObservationRead | null>(null);
  const [deleting, setDeleting] = useState(false);

  const loadLatest = useCallback(() => {
    setLoadingLatest(true);
    getLatestObservations(patientId)
      .then(setLatest)
      .catch(() => setError("Impossible de charger les dernières constantes."))
      .finally(() => setLoadingLatest(false));
  }, [patientId]);

  const loadSeries = useCallback(
    (r: Range) => {
      setLoadingCharts(true);
      const from = rangeFrom(r);
      getPatientObservations(patientId, from ? { from } : {})
        .then((all) => {
          const map: SeriesMap = {};
          for (const obs of all) {
            const code = obs.code as ObservationCode;
            if (!map[code]) map[code] = [];
            map[code]!.push(obs);
          }
          setSeries(map);
        })
        .catch(() => setError("Impossible de charger les graphiques."))
        .finally(() => setLoadingCharts(false));
    },
    [patientId],
  );

  useEffect(() => { loadLatest(); }, [loadLatest]);
  useEffect(() => { loadSeries(range); }, [loadSeries, range]);

  function afterSave() { loadLatest(); loadSeries(range); onMutation?.(); }

  function openDrawer() {
    if (onSplit) {
      onSplit("Nouvelle prise de constantes", (
        <VitalsForm
          patientId={patientId}
          encounterId={encounterId}
          onSaved={() => { afterSave(); onCloseSplit?.(); }}
          onClose={() => onCloseSplit?.()}
        />
      ));
      return;
    }
    setDrawerOpen(true);
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteObservation(deleteTarget.id);
      setDeleteTarget(null);
      loadLatest();
      loadSeries(range);
      onMutation?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Impossible de supprimer.");
    } finally {
      setDeleting(false);
    }
  }

  const imc = computeIMC(latest);
  const byCode = Object.fromEntries(latest.map((o) => [o.code, o])) as Partial<Record<ObservationCode, ObservationRead>>;

  return (
    <>
      {/* ── Header ── */}
      <div className="flex items-center justify-between gap-4 mb-4 flex-wrap">
        <div>
          <h2 className="text-body-md font-semibold text-on-surface">Constantes vitales</h2>
          {!loadingLatest && (
            <p className="text-body-sm text-on-surface-variant mt-0.5">
              {latest.length > 0
                ? `${latest.length} paramètre${latest.length > 1 ? "s" : ""} enregistré${latest.length > 1 ? "s" : ""}`
                : "Aucune mesure enregistrée"}
            </p>
          )}
        </div>
        {canWrite && (
          <button
            type="button"
            onClick={openDrawer}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-on-primary text-body-md font-medium hover:bg-primary-container transition-colors"
          >
            <AddOutlined style={{ fontSize: 18 }} />
            Nouvelle prise
          </button>
        )}
      </div>

      {error && (
        <p className="text-body-sm text-error bg-error-container/40 rounded-xl px-4 py-3 mb-4">{error}</p>
      )}

      {/* ── Zone A : Vignettes ── */}
      {loadingLatest ? (
        <LatestSkeleton />
      ) : latest.length === 0 ? (
        <div className="rounded-2xl border border-outline-variant bg-surface-container-lowest p-12 flex flex-col items-center gap-3 text-center mb-6">
          <FavoriteBorderOutlined style={{ fontSize: 32 }} className="text-on-surface-variant/30" />
          <p className="text-body-md text-on-surface-variant">Aucune constante enregistrée.</p>
          {canWrite && (
            <button
              type="button"
              onClick={openDrawer}
              className="text-body-sm text-primary underline underline-offset-2 hover:opacity-70 transition-opacity"
            >
              Saisir une première prise
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 mb-6">
          {byCode.TEMPERATURE && (
            <VignetteCard
              label="Température" value={byCode.TEMPERATURE.value.toFixed(1)} unit="°C"
              date={fmtShort(byCode.TEMPERATURE.measured_at)}
              abnormal={isAbnormal("TEMPERATURE", byCode.TEMPERATURE.value)}
              obs={byCode.TEMPERATURE} canWrite={canWrite} onDelete={setDeleteTarget}
            />
          )}
          {(byCode.TA_SYSTOLIQUE || byCode.TA_DIASTOLIQUE) && (() => {
            const sys = byCode.TA_SYSTOLIQUE;
            const dia = byCode.TA_DIASTOLIQUE;
            const val = sys && dia ? `${sys.value}/${dia.value}` : sys ? `${sys.value}/—` : `—/${dia!.value}`;
            const obs = sys ?? dia!;
            return (
              <VignetteCard
                label="Tension artérielle" value={val} unit="mmHg"
                date={fmtShort(obs.measured_at)}
                abnormal={(sys ? isAbnormal("TA_SYSTOLIQUE", sys.value) : false) || (dia ? isAbnormal("TA_DIASTOLIQUE", dia.value) : false)}
                obs={obs} canWrite={canWrite} onDelete={setDeleteTarget}
              />
            );
          })()}
          {byCode.FC && (
            <VignetteCard
              label="Fréq. cardiaque" value={String(Math.round(byCode.FC.value))} unit="bpm"
              date={fmtShort(byCode.FC.measured_at)}
              abnormal={isAbnormal("FC", byCode.FC.value)}
              obs={byCode.FC} canWrite={canWrite} onDelete={setDeleteTarget}
            />
          )}
          {byCode.FR && (
            <VignetteCard
              label="Fréq. respiratoire" value={String(Math.round(byCode.FR.value))} unit="rpm"
              date={fmtShort(byCode.FR.measured_at)}
              abnormal={isAbnormal("FR", byCode.FR.value)}
              obs={byCode.FR} canWrite={canWrite} onDelete={setDeleteTarget}
            />
          )}
          {byCode.SPO2 && (
            <VignetteCard
              label="SpO₂" value={byCode.SPO2.value.toFixed(0)} unit="%"
              date={fmtShort(byCode.SPO2.measured_at)}
              abnormal={isAbnormal("SPO2", byCode.SPO2.value)}
              obs={byCode.SPO2} canWrite={canWrite} onDelete={setDeleteTarget}
            />
          )}
          {byCode.POIDS && (
            <VignetteCard
              label="Poids" value={byCode.POIDS.value.toFixed(1)} unit="kg"
              date={fmtShort(byCode.POIDS.measured_at)}
              obs={byCode.POIDS} canWrite={canWrite} onDelete={setDeleteTarget}
            />
          )}
          {byCode.TAILLE && (
            <VignetteCard
              label="Taille" value={String(Math.round(byCode.TAILLE.value))} unit="cm"
              date={fmtShort(byCode.TAILLE.measured_at)}
              obs={byCode.TAILLE} canWrite={canWrite} onDelete={setDeleteTarget}
            />
          )}
          {/* IMC — computed client-side from latest poids+taille, never entered directly */}
          <VignetteCard
            label="IMC"
            value={imc !== null ? String(imc) : "—"}
            unit={imc !== null ? "kg/m²" : ""}
            estimated={imc !== null}
            abnormal={imc !== null && (imc < 18.5 || imc > 25)}
            canWrite={false}
          />
          {byCode.DOULEUR_EVA && (
            <VignetteCard
              label="Douleur (EVA)" value={byCode.DOULEUR_EVA.value.toFixed(0)} unit="/10"
              date={fmtShort(byCode.DOULEUR_EVA.measured_at)}
              abnormal={isAbnormal("DOULEUR_EVA", byCode.DOULEUR_EVA.value)}
              obs={byCode.DOULEUR_EVA} canWrite={canWrite} onDelete={setDeleteTarget}
            />
          )}
        </div>
      )}

      {/* ── Zone B : Charts ── */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-body-sm font-semibold text-on-surface-variant">Tendances</h3>
          <div className="flex items-center gap-1 bg-surface-container rounded-xl p-1">
            {(["7j", "30j", "all"] as Range[]).map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setRange(r)}
                className={`px-3 py-1 rounded-lg text-label-md transition-colors ${
                  r === range
                    ? "bg-surface text-on-surface font-medium shadow-sm"
                    : "text-on-surface-variant hover:text-on-surface"
                }`}
              >
                {r === "all" ? "Tout" : r}
              </button>
            ))}
          </div>
        </div>

        {loadingCharts ? (
          <ChartSkeleton />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {CHART_GROUPS.map((group) => {
              const seriesData: LineChartSeries[] = group.codes
                .map((code, i) => {
                  const obs = series[code] ?? [];
                  if (obs.length === 0) return null;
                  const color = i === 0
                    ? "var(--color-primary)"
                    : "var(--color-tertiary)";
                  return {
                    points: obs.map((o) => ({ t: o.measured_at, v: o.value })),
                    color,
                    label: LABELS[code],
                    unit: UNITS[code],
                  };
                })
                .filter(Boolean) as LineChartSeries[];

              if (seriesData.length === 0) return null;

              const hasEnoughData = seriesData.some((s) => s.points.length >= 2);
              const normalRange = group.codes.length === 1 ? NORMAL[group.codes[0]] : undefined;

              return (
                <div key={group.key} className="rounded-2xl border border-outline-variant bg-surface-container-lowest p-4">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-label-md font-medium text-on-surface-variant">{group.title}</p>
                    {group.codes.length > 1 && (
                      <div className="flex items-center gap-3">
                        {group.codes.map((code, i) => (
                          <span key={code} className="flex items-center gap-1 text-label-sm text-on-surface-variant">
                            <span
                              className="inline-block w-3 h-0.5 rounded"
                              style={{ background: i === 0 ? "var(--color-primary)" : "var(--color-tertiary)" }}
                            />
                            {LABELS[code]}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  {hasEnoughData ? (
                    <LineChart series={seriesData} normalBand={normalRange} />
                  ) : (
                    <div className="flex items-center justify-center h-[140px] rounded-xl border border-dashed border-outline-variant/60">
                      <p className="text-body-sm text-on-surface-variant/50">
                        {seriesData.every((s) => s.points.length === 0)
                          ? "Aucune donnée"
                          : "Données insuffisantes (min 2 points)"}
                      </p>
                    </div>
                  )}
                  {seriesData.some((s) => s.points.length > 0) && (
                    <div className="mt-2 flex justify-end">
                      <button
                        onClick={() => setValuesGroup(group)}
                        className="text-label-md text-primary hover:underline"
                      >
                        Voir plus ›
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Delete modal ── */}
      {deleteTarget && (
        <Modal title="Supprimer la mesure" onClose={() => !deleting && setDeleteTarget(null)}>
          <p className="text-body-md text-on-surface mb-5">
            Supprimer{" "}
            <strong>
              {LABELS[deleteTarget.code as ObservationCode]} — {deleteTarget.value}{" "}
              {UNITS[deleteTarget.code as ObservationCode]}
            </strong>{" "}
            du {fmtShort(deleteTarget.measured_at)} ?
          </p>
          <div className="flex gap-3 justify-end">
            <button
              type="button"
              onClick={() => setDeleteTarget(null)}
              disabled={deleting}
              className="px-4 py-2 rounded-xl text-body-md text-on-surface-variant border border-outline-variant hover:bg-surface-container transition-colors disabled:opacity-50"
            >
              Annuler
            </button>
            <button
              type="button"
              onClick={handleDelete}
              disabled={deleting}
              className="px-4 py-2 rounded-xl text-body-md bg-error text-white hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {deleting ? "Suppression…" : "Supprimer"}
            </button>
          </div>
        </Modal>
      )}

      {/* ── Zone C : Batch entry drawer (fallback quand onSplit non fourni) ── */}
      {drawerOpen && (
        <RightDrawer title="Nouvelle prise de constantes" onClose={() => setDrawerOpen(false)}>
          <VitalsForm
            patientId={patientId}
            encounterId={encounterId}
            onSaved={() => { setDrawerOpen(false); afterSave(); }}
            onClose={() => setDrawerOpen(false)}
          />
        </RightDrawer>
      )}

      {/* ── Valeurs chronologiques d'une tendance (« Voir plus ») ── */}
      {valuesGroup && (
        <RightDrawer title={valuesGroup.title} onClose={() => setValuesGroup(null)} width="md:w-[440px] md:max-w-[92vw]">
          <ChartValuesTable group={valuesGroup} series={series} />
        </RightDrawer>
      )}
    </>
  );
}

// Tableau des valeurs chronologiques qui composent une courbe de constante.
function ChartValuesTable({ group, series }: { group: ChartGroup; series: SeriesMap }) {
  const rows = group.codes
    .flatMap((code) =>
      (series[code] ?? []).map((o) => ({
        date: o.measured_at,
        code,
        value: o.value,
        unit: UNITS[code],
        label: group.codes.length > 1 ? LABELS[code] : null,
        abnormal: isAbnormal(code, o.value),
      })),
    )
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  if (rows.length === 0) {
    return <p className="text-body-sm text-on-surface-variant italic">Aucune valeur.</p>;
  }

  return (
    <div className="rounded-2xl border border-outline-variant overflow-hidden">
      <div className="grid grid-cols-[1fr_auto] px-4 py-2 bg-surface-container border-b border-outline-variant text-label-sm text-on-surface-variant">
        <span>Date</span>
        <span>Valeur</span>
      </div>
      {rows.map((r, i) => (
        <div
          key={`${r.code}-${r.date}-${i}`}
          className={`flex items-center gap-3 px-4 py-2 ${i % 2 === 0 ? "bg-surface-container-lowest" : "bg-surface-container-low"}`}
        >
          <span className="text-body-sm text-on-surface-variant whitespace-nowrap tabular-nums">{fmtDateTime(r.date)}</span>
          {r.label && <span className="text-label-sm text-on-surface-variant whitespace-nowrap">{r.label}</span>}
          <span className={`ml-auto text-body-md font-medium whitespace-nowrap tabular-nums ${r.abnormal ? "text-error" : "text-on-surface"}`}>
            {r.value} {r.unit}
          </span>
        </div>
      ))}
    </div>
  );
}

function fmtDateTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("fr-FR", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

// ─── Inline form field ────────────────────────────────────────────────────────

function VitalField({
  code, label, value, onChange, warn,
}: {
  code: ObservationCode;
  label: string;
  value: string;
  onChange: (v: string) => void;
  warn?: string | null;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-label-md font-medium text-on-surface-variant">
        {label}
        <span className="ml-1 text-on-surface-variant/50">{UNITS[code]}</span>
      </label>
      <input
        type="number"
        step="any"
        inputMode="decimal"
        className="w-full rounded-xl border border-outline-variant bg-surface-container-lowest px-3 py-2 text-body-md text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:border-primary transition-colors"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={BOUNDS[code] ? `${BOUNDS[code]![0]}–${BOUNDS[code]![1]}` : "—"}
      />
      {warn && <p className="text-label-sm text-error/80">{warn}</p>}
    </div>
  );
}
