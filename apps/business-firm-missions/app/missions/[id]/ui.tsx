"use client";

import { useEffect, useState, type ReactNode } from "react";
import { STATUT_PHASE_LABELS, STATUT_TACHE_LABELS, type Phase, type StatutTache } from "@/lib/bfm-missions-api";

export const FIELD =
  "rounded-lg border border-outline-soft bg-surface-container-lowest px-2.5 py-1.5 text-body-sm text-on-surface outline-none focus:border-primary transition-colors";
export const LABEL = "block text-label-sm uppercase text-outline mb-1";

export function MetaRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 px-4 py-3">
      <span className="text-body-sm text-on-surface-variant">{label}</span>
      {children}
    </div>
  );
}

export function TextValue({
  value,
  onSave,
  placeholder,
}: {
  value: string | null;
  onSave: (v: string | null) => void;
  placeholder?: string;
}) {
  const [v, setV] = useState(value ?? "");
  useEffect(() => setV(value ?? ""), [value]);
  return (
    <input
      value={v}
      placeholder={placeholder}
      onChange={(e) => setV(e.target.value)}
      onBlur={() => {
        const nv = v.trim() || null;
        if (nv !== (value ?? null)) onSave(nv);
      }}
      className="w-[190px] h-8 rounded-lg border border-outline-soft bg-surface-container-lowest px-2 text-body-sm text-on-surface outline-none focus:border-primary text-right"
    />
  );
}

export function NumberValue({
  value,
  onSave,
  step,
}: {
  value: number | null;
  onSave: (v: number | null) => void;
  step?: string;
}) {
  const [v, setV] = useState(value !== null ? String(value) : "");
  useEffect(() => setV(value !== null ? String(value) : ""), [value]);
  return (
    <input
      type="number"
      step={step ?? "1"}
      value={v}
      onChange={(e) => setV(e.target.value)}
      onBlur={() => {
        const nv = v === "" ? null : Number(v);
        if (nv !== value) onSave(nv);
      }}
      className="w-[110px] h-8 rounded-lg border border-outline-soft bg-surface-container-lowest px-2 text-body-sm text-on-surface outline-none focus:border-primary text-right"
    />
  );
}

export function DateValue({ value, onSave }: { value: string | null; onSave: (v: string | null) => void }) {
  return (
    <input
      type="date"
      value={value ? value.slice(0, 10) : ""}
      onChange={(e) => onSave(e.target.value || null)}
      className="h-8 rounded-lg border border-outline-soft bg-surface-container-lowest px-2 text-body-sm text-on-surface outline-none focus:border-primary"
    />
  );
}

export const STATUT_PHASE_TONES: Record<Phase["statut"], { dot: string; chip: string }> = {
  A_VENIR: { dot: "bg-status-backlog", chip: "bg-status-backlog-container text-status-backlog-on" },
  EN_COURS: { dot: "bg-status-doing", chip: "bg-status-doing-container text-status-doing" },
  CLOTUREE: { dot: "bg-status-done", chip: "bg-status-done-container text-status-done" },
};

export function StatutPhasePill({ statut }: { statut: Phase["statut"] }) {
  const tone = STATUT_PHASE_TONES[statut];
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-label-md font-semibold ${tone.chip}`}>
      <span className={`w-[6px] h-[6px] rounded-full ${tone.dot}`} />
      {STATUT_PHASE_LABELS[statut]}
    </span>
  );
}

export const STATUT_TACHE_TONES: Record<StatutTache, { dot: string; chip: string }> = {
  A_FAIRE: { dot: "bg-status-todo", chip: "bg-status-todo-container text-status-todo" },
  EN_COURS: { dot: "bg-status-doing", chip: "bg-status-doing-container text-status-doing" },
  TERMINEE: { dot: "bg-status-done", chip: "bg-status-done-container text-status-done" },
};

export function StatutTachePill({ statut }: { statut: StatutTache }) {
  const tone = STATUT_TACHE_TONES[statut];
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-label-md font-semibold ${tone.chip}`}>
      <span className={`w-[6px] h-[6px] rounded-full ${tone.dot}`} />
      {STATUT_TACHE_LABELS[statut]}
    </span>
  );
}
