import type { ObservationCode } from "@/app/lib/emr-api";

export const UNITS: Record<ObservationCode, string> = {
  TEMPERATURE: "°C",
  TA_SYSTOLIQUE: "mmHg",
  TA_DIASTOLIQUE: "mmHg",
  FC: "bpm",
  FR: "rpm",
  SPO2: "%",
  POIDS: "kg",
  TAILLE: "cm",
  IMC: "kg/m²",
  DOULEUR_EVA: "/10",
};

export const NORMAL: Partial<Record<ObservationCode, [number, number]>> = {
  TEMPERATURE: [36.1, 37.5],
  TA_SYSTOLIQUE: [90, 140],
  TA_DIASTOLIQUE: [60, 90],
  FC: [60, 100],
  FR: [12, 20],
  SPO2: [95, 100],
  DOULEUR_EVA: [0, 3],
};

export const BOUNDS: Partial<Record<ObservationCode, [number, number]>> = {
  TEMPERATURE: [30, 45],
  TA_SYSTOLIQUE: [50, 300],
  TA_DIASTOLIQUE: [30, 200],
  FC: [20, 300],
  FR: [4, 60],
  SPO2: [50, 100],
  POIDS: [0.5, 500],
  TAILLE: [20, 250],
  DOULEUR_EVA: [0, 10],
};

export function computeIMC(latest: Array<{ code: string; value: number }>): number | null {
  const p = latest.find((o) => o.code === "POIDS");
  const t = latest.find((o) => o.code === "TAILLE");
  if (!p || !t || t.value <= 0) return null;
  const tM = t.value / 100;
  return Math.round((p.value / (tM * tM)) * 10) / 10;
}

export function isAbnormal(code: ObservationCode, value: number): boolean {
  const r = NORMAL[code];
  return !!r && (value < r[0] || value > r[1]);
}

export function validateField(code: ObservationCode, raw: string): string | null {
  if (!raw.trim()) return null;
  const v = parseFloat(raw);
  if (isNaN(v)) return "Valeur invalide";
  const b = BOUNDS[code];
  if (b && (v < b[0] || v > b[1]))
    return `Valeur inhabituelle (attendu ${b[0]}–${b[1]} ${UNITS[code]})`;
  return null;
}
