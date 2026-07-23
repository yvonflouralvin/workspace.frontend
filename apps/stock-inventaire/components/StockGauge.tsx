import type { ItemSummary } from "@/lib/stock-api";

export type StockState = "rupture" | "bas" | "confortable" | "surstock" | "non-gere";

export const STOCK_STATE_LABELS: Record<StockState, string> = {
  rupture: "Rupture",
  bas: "Stock bas",
  confortable: "Confortable",
  surstock: "Surstock",
  "non-gere": "Non géré",
};

const TONES: Record<StockState, { bar: string; text: string; dot: string }> = {
  rupture: { bar: "bg-error", text: "text-error", dot: "bg-error" },
  bas: { bar: "bg-member-invited", text: "text-member-invited", dot: "bg-member-invited" },
  confortable: { bar: "bg-secondary", text: "text-member-active", dot: "bg-secondary" },
  surstock: { bar: "bg-tertiary", text: "text-tertiary", dot: "bg-tertiary" },
  "non-gere": { bar: "bg-track", text: "text-outline", dot: "bg-outline-variant" },
};

/**
 * Quatre états lisibles d'un coup d'œil. Le surstock se déclenche à trois fois
 * le minimum : au-delà, immobiliser du stock coûte plus qu'il ne sécurise.
 */
export function stockState(item: Pick<ItemSummary, "gestion_stock" | "stock_actuel" | "stock_minimum">): StockState {
  if (!item.gestion_stock) return "non-gere";
  const min = item.stock_minimum ?? 0;
  if (item.stock_actuel <= 0) return "rupture";
  if (min > 0 && item.stock_actuel <= min) return "bas";
  if (min > 0 && item.stock_actuel >= min * 3) return "surstock";
  return "confortable";
}

export function StockStateChip({ state }: { state: StockState }) {
  const tone = TONES[state];
  return (
    <span className={`inline-flex items-center gap-1.5 text-label-md font-semibold ${tone.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${tone.dot}`} />
      {STOCK_STATE_LABELS[state]}
    </span>
  );
}

/** Jauge avec repère du minimum — la barre seule ne dit pas si le niveau est sain. */
export function StockGauge({
  item,
  showLabel = true,
}: {
  item: Pick<ItemSummary, "gestion_stock" | "stock_actuel" | "stock_minimum" | "unite">;
  showLabel?: boolean;
}) {
  const state = stockState(item);
  if (state === "non-gere") {
    return <span className="text-label-md text-outline">Non géré</span>;
  }

  const min = item.stock_minimum ?? 0;
  // L'échelle va jusqu'à 3× le minimum (ou au stock courant s'il dépasse), pour
  // que le repère du minimum tombe toujours au tiers de la jauge.
  const scale = Math.max(item.stock_actuel, min * 3, 1);
  const fill = Math.min(100, (item.stock_actuel / scale) * 100);
  const marker = min > 0 ? Math.min(100, (min / scale) * 100) : null;
  const tone = TONES[state];

  return (
    <div className="min-w-[110px]">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-body-sm font-semibold text-on-surface tabular-nums">
          {item.stock_actuel}
          {item.unite ? <span className="font-normal text-outline"> {item.unite}</span> : null}
        </span>
        {showLabel && <StockStateChip state={state} />}
      </div>
      <div className="relative h-1.5 rounded-full bg-track mt-1.5 overflow-hidden">
        <div className={`h-full rounded-full ${tone.bar}`} style={{ width: `${fill}%` }} />
        {marker !== null && (
          <span
            className="absolute top-0 bottom-0 w-px bg-on-surface/40"
            style={{ left: `${marker}%` }}
            title={`Minimum : ${min}`}
          />
        )}
      </div>
    </div>
  );
}
