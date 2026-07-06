"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Modal } from "@repo/ui/Modal";
import { RightDrawer } from "@repo/ui/RightDrawer";
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

function fmtAxisDate(iso: string): string {
  return new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" });
}

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

// ─── Native SVG line chart (no external dependency) ──────────────────────────

type SvgPoint = { t: string; v: number };
type SvgSeries = { points: SvgPoint[]; color: string; label: string; unit: string };

interface MiniLineChartProps {
  series: SvgSeries[];
  normal?: [number, number];
}

function MiniLineChart({ series, normal }: MiniLineChartProps) {
  const W = 400;
  const H = 120;
  const PAD = { top: 6, right: 12, bottom: 28, left: 36 };
  const cw = W - PAD.left - PAD.right;
  const ch = H - PAD.top - PAD.bottom;

  const allVals = [
    ...series.flatMap((s) => s.points.map((p) => p.v)),
    ...(normal ?? []),
  ];
  const allTs = series.flatMap((s) => s.points.map((p) => new Date(p.t).getTime()));

  if (allTs.length === 0) return null;

  const minV = Math.min(...allVals);
  const maxV = Math.max(...allVals);
  const pad = (maxV - minV) * 0.15 || 1;
  const yMin = minV - pad;
  const yMax = maxV + pad;

  const tMin = Math.min(...allTs);
  const tMax = Math.max(...allTs);
  const tRange = tMax - tMin || 1;

  const xOf = (iso: string) => PAD.left + ((new Date(iso).getTime() - tMin) / tRange) * cw;
  const yOf = (v: number) => PAD.top + ch - ((v - yMin) / (yMax - yMin)) * ch;

  // Pick 3-4 x-axis tick dates
  const allSortedTs = [...new Set(allTs)].sort((a, b) => a - b);
  const step = Math.max(1, Math.floor(allSortedTs.length / 3));
  const tickIdxs = [0, step, step * 2, allSortedTs.length - 1].filter(
    (i, pos, arr) => i < allSortedTs.length && arr.indexOf(i) === pos,
  );

  const [tooltip, setTooltip] = useState<{ x: number; y: number; lines: string[] } | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  return (
    <div className="relative w-full">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        className="w-full"
        preserveAspectRatio="xMidYMid meet"
        style={{ height: 140 }}
        onMouseLeave={() => setTooltip(null)}
      >
        {/* Normal band */}
        {normal && (
          <rect
            x={PAD.left}
            y={yOf(normal[1])}
            width={cw}
            height={Math.abs(yOf(normal[0]) - yOf(normal[1]))}
            fill="var(--color-primary)"
            fillOpacity={0.06}
          />
        )}

        {/* Horizontal grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map((f) => {
          const y = PAD.top + ch * (1 - f);
          const val = yMin + (yMax - yMin) * f;
          return (
            <g key={f}>
              <line
                x1={PAD.left} y1={y} x2={PAD.left + cw} y2={y}
                stroke="var(--color-outline-variant)" strokeOpacity={0.4} strokeDasharray="3 3"
              />
              <text x={PAD.left - 4} y={y + 3} textAnchor="end" fontSize={9} fill="var(--color-on-surface-variant)">
                {Number.isInteger(val) ? val : val.toFixed(1)}
              </text>
            </g>
          );
        })}

        {/* X axis ticks */}
        {tickIdxs.map((idx) => {
          const iso = new Date(allSortedTs[idx]).toISOString();
          const x = xOf(iso);
          return (
            <text key={idx} x={x} y={H - 6} textAnchor="middle" fontSize={9} fill="var(--color-on-surface-variant)">
              {fmtAxisDate(iso)}
            </text>
          );
        })}

        {/* Series polylines */}
        {series.map((s, si) => {
          if (s.points.length < 2) return null;
          const pts = s.points.map((p) => `${xOf(p.t)},${yOf(p.v)}`).join(" ");
          return (
            <polyline
              key={si}
              points={pts}
              fill="none"
              stroke={s.color}
              strokeWidth={2}
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          );
        })}

        {/* Data points (interactive) */}
        {series.map((s, si) =>
          s.points.map((p, pi) => (
            <circle
              key={`${si}-${pi}`}
              cx={xOf(p.t)}
              cy={yOf(p.v)}
              r={4}
              fill={s.color}
              style={{ cursor: "default" }}
              onMouseEnter={(e) => {
                const svg = svgRef.current;
                if (!svg) return;
                const rect = svg.getBoundingClientRect();
                const scaleX = rect.width / W;
                const scaleY = rect.height / H;
                const cx = xOf(p.t) * scaleX + rect.left;
                const cy = yOf(p.v) * scaleY + rect.top;
                const lines = series.map((ss) => {
                  const match = ss.points.find((pp) => pp.t === p.t);
                  return match ? `${ss.label}: ${match.v} ${ss.unit}` : null;
                }).filter(Boolean) as string[];
                setTooltip({ x: cx, y: cy, lines: [fmtShort(p.t), ...lines] });
              }}
            />
          )),
        )}
      </svg>

      {/* Floating tooltip */}
      {tooltip && (
        <div
          className="fixed z-50 pointer-events-none rounded-xl border border-outline-variant bg-surface-container-low px-3 py-2 text-label-sm text-on-surface shadow-md"
          style={{ left: tooltip.x + 12, top: tooltip.y - 8, transform: "translateY(-100%)" }}
        >
          {tooltip.lines.map((l, i) => (
            <p key={i} className={i === 0 ? "text-on-surface-variant mb-0.5" : "font-medium"}>{l}</p>
          ))}
        </div>
      )}
    </div>
  );
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

export function VitalsTab({
  patientId,
  canWrite,
  onMutation,
  encounterId,
}: {
  patientId: number;
  canWrite: boolean;
  onMutation?: () => void;
  encounterId?: number;
}) {
  const [latest, setLatest] = useState<ObservationRead[]>([]);
  const [series, setSeries] = useState<SeriesMap>({});
  const [range, setRange] = useState<Range>("30j");

  const [loadingLatest, setLoadingLatest] = useState(true);
  const [loadingCharts, setLoadingCharts] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [formValues, setFormValues] = useState<FormValues>({});
  const [measuredAt, setMeasuredAt] = useState(nowLocal());
  const [formErrors, setFormErrors] = useState<Partial<Record<ObservationCode, string>>>({});
  const [formGlobalError, setFormGlobalError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

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

  function openDrawer() {
    setFormValues({});
    setFormErrors({});
    setFormGlobalError(null);
    setMeasuredAt(nowLocal());
    setDrawerOpen(true);
  }

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
      setDrawerOpen(false);
      loadLatest();
      loadSeries(range);
      onMutation?.();
    } catch (err) {
      setFormGlobalError(err instanceof Error ? err.message : "Erreur lors de l'enregistrement.");
    } finally {
      setSaving(false);
    }
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
              const seriesData: SvgSeries[] = group.codes
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
                .filter(Boolean) as SvgSeries[];

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
                    <MiniLineChart series={seriesData} normal={normalRange} />
                  ) : (
                    <div className="flex items-center justify-center h-[140px] rounded-xl border border-dashed border-outline-variant/60">
                      <p className="text-body-sm text-on-surface-variant/50">
                        {seriesData.every((s) => s.points.length === 0)
                          ? "Aucune donnée"
                          : "Données insuffisantes (min 2 points)"}
                      </p>
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

      {/* ── Zone C : Batch entry drawer ── */}
      {drawerOpen && (
        <RightDrawer title="Nouvelle prise de constantes" onClose={() => !saving && setDrawerOpen(false)}>
          <form onSubmit={handleSubmit} className="h-full flex flex-col gap-5 overflow-y-auto">
            <div className="flex-1 space-y-4 overflow-y-auto">
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

              {/* Live IMC preview when poids + taille are entered */}
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
                onClick={() => setDrawerOpen(false)}
                disabled={saving}
                className="px-5 py-2 rounded-xl text-body-md text-on-surface-variant border border-outline-variant hover:bg-surface-container transition-colors disabled:opacity-50"
              >
                Annuler
              </button>
            </div>
          </form>
        </RightDrawer>
      )}
    </>
  );
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
