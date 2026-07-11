"use client";

import { useState } from "react";
import { PERIOD_PRESETS, presetRange, type PeriodPreset } from "@/lib/periods";

const dateInput =
  "rounded-xl border border-outline-variant bg-surface-container-lowest px-2.5 py-1.5 text-body-sm text-on-surface focus:border-primary focus:outline-none";

// Sélecteur de période réutilisable : presets relatifs + Du/Au manuel. Contrôlé par le parent.
export function PeriodFilter({ from, to, onChange }: { from: string; to: string; onChange: (from: string, to: string) => void }) {
  const [preset, setPreset] = useState<PeriodPreset>("custom");

  const applyPreset = (p: PeriodPreset) => {
    setPreset(p);
    const r = presetRange(p);
    if (r) onChange(r.from, r.to);
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <select value={preset} onChange={(e) => applyPreset(e.target.value as PeriodPreset)} className={dateInput}>
        {PERIOD_PRESETS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
      </select>
      <label className="flex items-center gap-1.5 text-label-md text-on-surface-variant">
        Du
        <input type="date" value={from} max={to || undefined} onChange={(e) => { setPreset("custom"); onChange(e.target.value, to); }} className={dateInput} />
      </label>
      <label className="flex items-center gap-1.5 text-label-md text-on-surface-variant">
        Au
        <input type="date" value={to} min={from || undefined} onChange={(e) => { setPreset("custom"); onChange(from, e.target.value); }} className={dateInput} />
      </label>
      {(from || to) && (
        <button type="button" onClick={() => { setPreset("custom"); onChange("", ""); }} className="text-label-md text-primary hover:opacity-70">Réinitialiser</button>
      )}
    </div>
  );
}
