"use client";

import { useEffect, useState, type ReactNode } from "react";
import { FactCheckOutlined, UploadFileOutlined } from "@mui/icons-material";
import {
  STATUT_PHASE_LABELS,
  STATUT_TACHE_LABELS,
  TYPE_TACHE_LABELS,
  type Phase,
  type PrioriteTache,
  type StatutTache,
  type TypeTache,
} from "@/lib/bfm-missions-api";

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
  disabled = false,
}: {
  value: string | null;
  onSave: (v: string | null) => void;
  placeholder?: string;
  disabled?: boolean;
}) {
  const [v, setV] = useState(value ?? "");
  useEffect(() => setV(value ?? ""), [value]);
  return (
    <input
      value={v}
      placeholder={placeholder}
      disabled={disabled}
      onChange={(e) => setV(e.target.value)}
      onBlur={() => {
        const nv = v.trim() || null;
        if (nv !== (value ?? null)) onSave(nv);
      }}
      className="w-[190px] h-8 rounded-lg border border-outline-soft bg-surface-container-lowest px-2 text-body-sm text-on-surface outline-none focus:border-primary text-right disabled:opacity-60"
    />
  );
}

export function NumberValue({
  value,
  onSave,
  step,
  disabled = false,
}: {
  value: number | null;
  onSave: (v: number | null) => void;
  step?: string;
  disabled?: boolean;
}) {
  const [v, setV] = useState(value !== null ? String(value) : "");
  useEffect(() => setV(value !== null ? String(value) : ""), [value]);
  return (
    <input
      type="number"
      step={step ?? "1"}
      value={v}
      disabled={disabled}
      onChange={(e) => setV(e.target.value)}
      onBlur={() => {
        const nv = v === "" ? null : Number(v);
        if (nv !== value) onSave(nv);
      }}
      className="w-[110px] h-8 rounded-lg border border-outline-soft bg-surface-container-lowest px-2 text-body-sm text-on-surface outline-none focus:border-primary text-right disabled:opacity-60"
    />
  );
}

export function DateValue({
  value,
  onSave,
  disabled = false,
}: {
  value: string | null;
  onSave: (v: string | null) => void;
  disabled?: boolean;
}) {
  return (
    <input
      type="date"
      value={value ? value.slice(0, 10) : ""}
      disabled={disabled}
      onChange={(e) => onSave(e.target.value || null)}
      className="h-8 rounded-lg border border-outline-soft bg-surface-container-lowest px-2 text-body-sm text-on-surface outline-none focus:border-primary disabled:opacity-60"
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
  // Terminée attend encore la décision du validateur : elle n'est « faite » qu'une fois Validée.
  TERMINEE: { dot: "bg-status-review", chip: "bg-status-review-container text-status-review" },
  VALIDEE: { dot: "bg-status-done", chip: "bg-status-done-container text-status-done" },
  A_REVOIR: { dot: "bg-error", chip: "bg-error-container text-error" },
};

/** Le verbe du geste, plutôt que le nom du statut d'arrivée : « Démarrer », pas « En cours ». */
export function libelleAction(ancien: StatutTache, nouveau: StatutTache): string {
  if (nouveau === "EN_COURS") return ancien === "A_REVOIR" ? "Reprendre" : ancien === "A_FAIRE" ? "Démarrer" : "Remettre en cours";
  if (nouveau === "TERMINEE") return "Terminer";
  if (nouveau === "VALIDEE") return "Valider";
  if (nouveau === "A_REVOIR") return "Remettre à revoir";
  return "Remettre à faire";
}

/** Une tâche « faite » : terminée par l'exécutant, ou validée. */
export const estTerminee = (s: StatutTache) => s === "TERMINEE" || s === "VALIDEE";

export function StatutTachePill({ statut }: { statut: StatutTache }) {
  const tone = STATUT_TACHE_TONES[statut];
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-label-md font-semibold ${tone.chip}`}>
      <span className={`w-[6px] h-[6px] rounded-full ${tone.dot}`} />
      {STATUT_TACHE_LABELS[statut]}
    </span>
  );
}

/** Le type d'une tâche, pour les tâches qui en ont un : une tâche ordinaire n'affiche rien. */
export function TypeTachePuce({ type }: { type: TypeTache }) {
  if (type === "STANDARD") return null;
  return (
    <span className="flex-none inline-flex items-center gap-1 rounded-full bg-surface-container px-2 py-0.5 text-label-sm font-semibold text-on-surface-variant">
      {type === "CONTROLE" ? <FactCheckOutlined style={{ fontSize: 12 }} /> : <UploadFileOutlined style={{ fontSize: 12 }} />}
      {TYPE_TACHE_LABELS[type]}
    </span>
  );
}

/** Seules les priorités qui pressent se colorent : le reste se lit sans qu'on ait à le remarquer. */
export const COULEUR_PRIORITE: Partial<Record<PrioriteTache, string>> = {
  URGENTE: "text-priority-urgent",
  HAUTE: "text-priority-high",
};
