"use client";

import { useEffect, useRef, useState } from "react";
import {
  getPatientLabParameters,
  getLabParameterSeries,
  type LabParameterSummary,
  type LabTrendSeries,
  type LabTrendPoint,
} from "@/app/lib/lab-api";
import { TimelineOutlined } from "@mui/icons-material";
import { RightDrawer } from "@repo/ui/RightDrawer";

const RANGES = [
  { key: "3m", label: "3 mois", months: 3 },
  { key: "6m", label: "6 mois", months: 6 },
  { key: "1y", label: "1 an", months: 12 },
  { key: "all", label: "Tout", months: 0 },
];

function fromMonthsAgo(months: number): string | undefined {
  if (!months) return undefined;
  const d = new Date();
  d.setMonth(d.getMonth() - months);
  return d.toISOString().slice(0, 10);
}

function fmtDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "2-digit" });
}

const INTERP_LABEL: Record<string, string> = {
  NORMAL: "Normal", BAS: "Bas", HAUT: "Haut", CRITIQUE: "Critique", INDETERMINE: "Indéterminé",
};

function pointColor(p: LabTrendPoint): string {
  if (p.interpretation === "CRITIQUE") return "var(--color-error)";
  if (p.abnormal) return "var(--color-error)";
  return "var(--color-primary)";
}

// ── Courbe SVG (même esprit que les constantes vitales de l'EMR) ───────────────
function TrendChart({ series }: { series: LabTrendSeries }) {
  const W = 440, H = 150;
  const PAD = { top: 8, right: 14, bottom: 28, left: 40 };
  const cw = W - PAD.left - PAD.right;
  const ch = H - PAD.top - PAD.bottom;
  const svgRef = useRef<SVGSVGElement>(null);
  const [tip, setTip] = useState<{ x: number; y: number; p: LabTrendPoint } | null>(null);

  const pts = series.points.filter((p) => p.value_numeric !== null);
  const band = series.reference_band;

  const vals = [
    ...pts.map((p) => p.value_numeric as number),
    ...(band?.low != null ? [band.low] : []),
    ...(band?.high != null ? [band.high] : []),
  ];
  const ts = pts.map((p) => (p.date ? new Date(p.date).getTime() : 0));
  if (pts.length === 0) return null;

  const minV = Math.min(...vals), maxV = Math.max(...vals);
  const pad = (maxV - minV) * 0.15 || 1;
  const yMin = minV - pad, yMax = maxV + pad;
  const tMin = Math.min(...ts), tMax = Math.max(...ts);
  const tRange = tMax - tMin || 1;

  const xOf = (iso: string) => PAD.left + ((new Date(iso).getTime() - tMin) / tRange) * cw;
  const yOf = (v: number) => PAD.top + ch - ((v - yMin) / (yMax - yMin)) * ch;

  const sortedTs = [...new Set(ts)].sort((a, b) => a - b);
  const step = Math.max(1, Math.floor(sortedTs.length / 3));
  const tickIdxs = [0, step, step * 2, sortedTs.length - 1].filter((i, pos, arr) => i < sortedTs.length && arr.indexOf(i) === pos);

  const bandTop = band?.high != null ? yOf(band.high) : PAD.top;
  const bandBottom = band?.low != null ? yOf(band.low) : PAD.top + ch;

  return (
    <div className="relative w-full">
      <svg ref={svgRef} viewBox={`0 0 ${W} ${H}`} className="w-full" preserveAspectRatio="xMidYMid meet" style={{ height: 170 }} onMouseLeave={() => setTip(null)}>
        {band && (band.low != null || band.high != null) && (
          <rect x={PAD.left} y={bandTop} width={cw} height={Math.max(0, bandBottom - bandTop)} fill="var(--color-secondary)" fillOpacity={0.08} />
        )}

        {[0, 0.25, 0.5, 0.75, 1].map((f) => {
          const y = PAD.top + ch * (1 - f);
          const val = yMin + (yMax - yMin) * f;
          return (
            <g key={f}>
              <line x1={PAD.left} y1={y} x2={PAD.left + cw} y2={y} stroke="var(--color-outline-variant)" strokeOpacity={0.4} strokeDasharray="3 3" />
              <text x={PAD.left - 4} y={y + 3} textAnchor="end" fontSize={9} fill="var(--color-on-surface-variant)">
                {Number.isInteger(val) ? val : val.toFixed(1)}
              </text>
            </g>
          );
        })}

        {tickIdxs.map((idx) => {
          const iso = new Date(sortedTs[idx]).toISOString();
          return (
            <text key={idx} x={xOf(iso)} y={H - 6} textAnchor="middle" fontSize={9} fill="var(--color-on-surface-variant)">
              {fmtDate(iso)}
            </text>
          );
        })}

        {pts.length >= 2 && (
          <polyline points={pts.map((p) => `${xOf(p.date!)},${yOf(p.value_numeric as number)}`).join(" ")} fill="none" stroke="var(--color-primary)" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
        )}

        {pts.map((p, i) => (
          <circle
            key={i}
            cx={xOf(p.date!)}
            cy={yOf(p.value_numeric as number)}
            r={p.abnormal ? 5 : 4}
            fill={pointColor(p)}
            stroke="var(--color-surface)"
            strokeWidth={p.abnormal ? 1.5 : 0}
            style={{ cursor: "pointer" }}
            onMouseEnter={() => {
              const svg = svgRef.current;
              if (!svg) return;
              const rect = svg.getBoundingClientRect();
              setTip({
                x: xOf(p.date!) * (rect.width / W),
                y: yOf(p.value_numeric as number) * (rect.height / H),
                p,
              });
            }}
          />
        ))}
      </svg>

      {tip && (
        <div
          className="absolute z-10 pointer-events-none rounded-xl border border-outline-variant bg-surface-container-lowest shadow-lg px-3 py-2 text-label-sm w-56"
          style={{ left: Math.min(tip.x + 8, 260), top: Math.max(tip.y - 10, 0) }}
        >
          <p className="font-semibold text-on-surface">{fmtDate(tip.p.date)}</p>
          <p className="text-on-surface">
            {tip.p.value_numeric} {tip.p.unit}
            <span className={`ml-1.5 ${tip.p.abnormal ? "text-error font-medium" : "text-secondary"}`}>
              {INTERP_LABEL[tip.p.interpretation] ?? tip.p.interpretation}
            </span>
          </p>
          {tip.p.reference_used && <p className="text-on-surface-variant">Réf. : {tip.p.reference_used}</p>}
          <p className="text-on-surface-variant/70 mt-1">
            Contexte : {[
              tip.p.context.age_years != null ? `${tip.p.context.age_years} ans` : null,
              tip.p.context.weight != null ? `${tip.p.context.weight} kg` : null,
            ].filter(Boolean).join(" · ") || "—"}
          </p>
        </div>
      )}
    </div>
  );
}

export function LabTrends({ patientId }: { patientId: number | string }) {
  const [params, setParams] = useState<LabParameterSummary[] | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [range, setRange] = useState("6m");
  const [series, setSeries] = useState<LabTrendSeries | null>(null);
  const [loading, setLoading] = useState(true);
  const [seriesLoading, setSeriesLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showValues, setShowValues] = useState(false);

  useEffect(() => {
    getPatientLabParameters(patientId)
      .then((ps) => {
        setParams(ps);
        setSelected((cur) => cur ?? (ps[0]?.parameter_code ?? null));
      })
      .catch(() => setError("Impossible de charger les paramètres."))
      .finally(() => setLoading(false));
  }, [patientId]);

  useEffect(() => {
    if (!selected) return;
    setSeriesLoading(true);
    const from = fromMonthsAgo(RANGES.find((r) => r.key === range)?.months ?? 0);
    getLabParameterSeries(patientId, selected, from)
      .then(setSeries)
      .catch(() => setSeries(null))
      .finally(() => setSeriesLoading(false));
  }, [selected, range, patientId]);

  if (loading) {
    return <div className="h-48 rounded-2xl bg-surface-container animate-pulse" />;
  }

  if (error) {
    return <p className="text-body-sm text-error bg-error-container/40 rounded-xl px-4 py-3">{error}</p>;
  }

  if (!params || params.length === 0) {
    return (
      <div className="rounded-2xl border border-outline-variant bg-surface-container-lowest p-12 flex flex-col items-center gap-3 text-center">
        <TimelineOutlined style={{ fontSize: 32 }} className="text-on-surface-variant/30" />
        <p className="text-body-md text-on-surface-variant">Aucun résultat validé à visualiser.</p>
      </div>
    );
  }

  const points = series?.points.filter((p) => p.value_numeric !== null) ?? [];

  return (
    <div className="space-y-4">
      {/* Sélecteur de paramètre */}
      <div className="flex flex-wrap gap-2">
        {params.map((p) => (
          <button
            key={p.parameter_code}
            onClick={() => setSelected(p.parameter_code)}
            className={`px-3 py-1.5 rounded-xl text-body-sm border transition-colors ${
              selected === p.parameter_code
                ? "border-primary bg-primary/10 text-primary font-medium"
                : "border-outline-variant text-on-surface-variant hover:bg-surface-container"
            }`}
          >
            {p.name}
            <span className="ml-1.5 text-label-sm text-on-surface-variant/60">{p.count}</span>
          </button>
        ))}
      </div>

      {/* Plage temporelle */}
      <div className="flex items-center gap-1.5">
        {RANGES.map((r) => (
          <button
            key={r.key}
            onClick={() => setRange(r.key)}
            className={`px-2.5 py-1 rounded-lg text-label-md transition-colors ${
              range === r.key ? "bg-surface-container-high text-on-surface font-medium" : "text-on-surface-variant hover:bg-surface-container"
            }`}
          >
            {r.label}
          </button>
        ))}
      </div>

      {/* Courbe */}
      <div className="rounded-2xl border border-outline-variant bg-surface-container-lowest p-4">
        {seriesLoading ? (
          <div className="h-40 rounded-xl bg-surface-container animate-pulse" />
        ) : points.length === 0 ? (
          <p className="text-body-sm text-on-surface-variant text-center py-10">
            Aucune mesure sur cette période.
          </p>
        ) : points.length === 1 ? (
          <div className="text-center py-8 space-y-1">
            <p className="text-headline-sm font-display text-on-surface tabular-nums">
              {points[0].value_numeric} <span className="text-body-md text-on-surface-variant">{points[0].unit}</span>
            </p>
            <p className={`text-body-sm ${points[0].abnormal ? "text-error" : "text-secondary"}`}>
              {INTERP_LABEL[points[0].interpretation] ?? points[0].interpretation} — {fmtDate(points[0].date)}
            </p>
            <p className="text-label-sm text-on-surface-variant/60">Une seule mesure — pas encore de courbe d&apos;évolution.</p>
          </div>
        ) : (
          <>
            <TrendChart series={series!} />
            {series?.reference_band?.label && (
              <p className="text-label-sm text-on-surface-variant/70 mt-2 flex items-center gap-1.5">
                <span className="inline-block w-3 h-2 rounded-sm bg-secondary/20" />
                Plage de référence : {series.reference_band.label}
              </p>
            )}
          </>
        )}
        {points.length > 0 && (
          <div className="mt-2 flex justify-end">
            <button onClick={() => setShowValues(true)} className="text-label-md text-primary hover:underline">
              Voir plus ›
            </button>
          </div>
        )}
      </div>

      {showValues && series && (
        <RightDrawer title={series.name} onClose={() => setShowValues(false)} width="md:w-[440px] md:max-w-[92vw]">
          <LabValuesTable series={series} />
        </RightDrawer>
      )}
    </div>
  );
}

// Tableau des valeurs chronologiques qui composent la courbe d'un paramètre labo.
function LabValuesTable({ series }: { series: LabTrendSeries }) {
  const rows = series.points
    .filter((p) => p.value_numeric !== null)
    .slice()
    .sort((a, b) => new Date(b.date ?? 0).getTime() - new Date(a.date ?? 0).getTime());

  if (rows.length === 0) {
    return <p className="text-body-sm text-on-surface-variant italic">Aucune valeur.</p>;
  }

  return (
    <div className="rounded-2xl border border-outline-variant overflow-hidden">
      <div className="grid grid-cols-[1fr_auto] px-4 py-2 bg-surface-container border-b border-outline-variant text-label-sm text-on-surface-variant">
        <span>Date</span>
        <span>Valeur</span>
      </div>
      {rows.map((p, i) => (
        <div
          key={`${p.date}-${i}`}
          className={`flex items-center px-4 py-2 gap-3 ${i % 2 === 0 ? "bg-surface-container-lowest" : "bg-surface-container-low"}`}
        >
          <span className="text-body-sm text-on-surface-variant whitespace-nowrap tabular-nums">{fmtDateTime(p.date)}</span>
          {p.interpretation && p.interpretation !== "NORMAL" && (
            <span className={`text-label-sm whitespace-nowrap ${p.abnormal ? "text-error" : "text-on-surface-variant"}`}>
              {INTERP_LABEL[p.interpretation] ?? p.interpretation}
            </span>
          )}
          <span className={`ml-auto text-body-md font-medium tabular-nums whitespace-nowrap ${p.abnormal ? "text-error" : "text-on-surface"}`}>
            {p.value_numeric} {p.unit ?? series.unit ?? ""}
          </span>
        </div>
      ))}
    </div>
  );
}

function fmtDateTime(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("fr-FR", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}
