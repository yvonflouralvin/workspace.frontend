// Presets de période relatifs → intervalle {from, to} (ISO YYYY-MM-DD, date locale).
export type PeriodPreset = "custom" | "today" | "last7" | "last30" | "month" | "prev_month" | "year";

export const PERIOD_PRESETS: { value: PeriodPreset; label: string }[] = [
  { value: "custom", label: "Personnalisé" },
  { value: "today", label: "Aujourd'hui" },
  { value: "last7", label: "7 derniers jours" },
  { value: "last30", label: "30 derniers jours" },
  { value: "month", label: "Ce mois" },
  { value: "prev_month", label: "Mois dernier" },
  { value: "year", label: "Cette année" },
];

function iso(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function presetRange(p: PeriodPreset): { from: string; to: string } | null {
  if (p === "custom") return null;
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const daysAgo = (n: number) => { const d = new Date(today); d.setDate(d.getDate() - n); return d; };
  switch (p) {
    case "today":
      return { from: iso(today), to: iso(today) };
    case "last7":
      return { from: iso(daysAgo(6)), to: iso(today) };
    case "last30":
      return { from: iso(daysAgo(29)), to: iso(today) };
    case "month":
      return { from: iso(new Date(now.getFullYear(), now.getMonth(), 1)), to: iso(today) };
    case "prev_month": {
      const first = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const last = new Date(now.getFullYear(), now.getMonth(), 0);
      return { from: iso(first), to: iso(last) };
    }
    case "year":
      return { from: iso(new Date(now.getFullYear(), 0, 1)), to: iso(today) };
    default:
      return null;
  }
}

// Intervalles d'auto-rafraîchissement (ms). 0 = désactivé.
export const REFRESH_OPTIONS: { value: number; label: string }[] = [
  { value: 0, label: "Auto : off" },
  { value: 30000, label: "Auto : 30 s" },
  { value: 60000, label: "Auto : 1 min" },
  { value: 300000, label: "Auto : 5 min" },
];
