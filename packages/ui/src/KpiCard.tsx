"use client";

import Link from "next/link";

export interface KpiCardProps {
  label: string;
  value: React.ReactNode;
  icon: React.ReactNode;
  /** Ligne de tendance sous la valeur. */
  hint?: string;
  hintTone?: "neutral" | "positive" | "negative";
  /** Visualisation optionnelle à droite de la valeur (ex. `Sparkline`). */
  visual?: React.ReactNode;
  href?: string;
}

const HINT_TONES = {
  neutral: "text-outline",
  positive: "text-secondary",
  negative: "text-error",
};

export function KpiCard({
  label,
  value,
  icon,
  hint,
  hintTone = "neutral",
  visual,
  href,
}: KpiCardProps) {
  const body = (
    <>
      <div className="flex items-start justify-between gap-3">
        <span className="text-body-md text-on-surface-variant">{label}</span>
        <span className="w-9 h-9 flex-none rounded-xl bg-primary/10 text-primary flex items-center justify-center">
          {icon}
        </span>
      </div>
      <div className="flex items-end justify-between gap-3 mt-3.5">
        <span className="font-display text-headline-lg text-on-surface">{value}</span>
        {visual}
      </div>
      {hint && <p className={`text-label-md mt-2 ${HINT_TONES[hintTone]}`}>{hint}</p>}
    </>
  );

  const className = "block rounded-2xl border border-outline-soft bg-surface-container-lowest p-5";

  if (!href) return <div className={className}>{body}</div>;

  return (
    <Link
      href={href}
      className={`${className} hover:border-primary/40 hover:bg-primary/5 transition-colors`}
    >
      {body}
    </Link>
  );
}
