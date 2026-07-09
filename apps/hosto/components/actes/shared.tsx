"use client";

import {
  CheckCircleOutlined,
  CancelOutlined,
  PaymentsOutlined,
  PlayCircleOutlineOutlined,
  ScheduleOutlined,
} from "@mui/icons-material";
import type { ActePrescritStatus } from "@/app/lib/actes-api";

// ─── Statut ────────────────────────────────────────────────────────────────────

export const STATUS_LABEL: Record<ActePrescritStatus, string> = {
  PRESCRIT: "Prescrit",
  EN_ATTENTE_PAIEMENT: "Paiement requis",
  REALISABLE: "À réaliser",
  REALISE: "Réalisé",
  ANNULE: "Annulé",
};

const STATUS_CLS: Record<ActePrescritStatus, string> = {
  PRESCRIT: "bg-surface-container text-on-surface-variant",
  // Avertissement (le soignant comprend pourquoi il ne peut pas encore réaliser).
  EN_ATTENTE_PAIEMENT: "bg-error-container text-error",
  REALISABLE: "bg-tertiary/10 text-tertiary",
  REALISE: "bg-secondary/10 text-secondary",
  ANNULE: "bg-surface-container text-on-surface-variant/60",
};

const STATUS_ICON: Record<ActePrescritStatus, React.ReactNode> = {
  PRESCRIT: <ScheduleOutlined style={{ fontSize: 13 }} />,
  EN_ATTENTE_PAIEMENT: <PaymentsOutlined style={{ fontSize: 13 }} />,
  REALISABLE: <PlayCircleOutlineOutlined style={{ fontSize: 13 }} />,
  REALISE: <CheckCircleOutlined style={{ fontSize: 13 }} />,
  ANNULE: <CancelOutlined style={{ fontSize: 13 }} />,
};

export function StatusBadge({ status }: { status: ActePrescritStatus }) {
  return (
    <span
      className={`inline-flex items-center gap-1 text-label-sm px-2 py-0.5 rounded-full font-medium shrink-0 ${STATUS_CLS[status]}`}
    >
      {STATUS_ICON[status]}
      {STATUS_LABEL[status]}
    </span>
  );
}

// ─── Formatage ─────────────────────────────────────────────────────────────────

export function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function fmtDateTime(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// Nom + rôle de l'acteur, avec repli sur l'identifiant si le snapshot est absent
// (actes créés avant l'ajout du snapshot).
export function actorLabel(
  name: string | null,
  role: string | null,
  fallbackId: number,
): string {
  const who = name?.trim() || `Utilisateur #${fallbackId}`;
  return role?.trim() ? `${who} · ${role}` : who;
}

// datetime-local par défaut = maintenant (heure locale), sans les secondes.
export function nowLocalInput(): string {
  const d = new Date();
  const off = d.getTimezoneOffset();
  return new Date(d.getTime() - off * 60_000).toISOString().slice(0, 16);
}

// ─── Notice « paiement requis » (flux métier, pas une erreur) ──────────────────

export function PaiementRequisNotice({
  message,
  tone = "info",
}: {
  message?: string;
  tone?: "info" | "warn";
}) {
  const cls =
    tone === "warn"
      ? "border-error/40 bg-error-container/40 text-error"
      : "border-tertiary/30 bg-tertiary/8 text-tertiary";
  return (
    <div
      className={`flex items-start gap-2 rounded-xl border px-3 py-2.5 text-body-sm ${cls}`}
      role="note"
    >
      <PaymentsOutlined style={{ fontSize: 16 }} className="shrink-0 mt-0.5" />
      <p>
        {message ??
          "Cet acte requiert un paiement préalable. Le patient devra régler avant sa réalisation."}
      </p>
    </div>
  );
}

// ─── Champs de réalisation (réutilisés : réaliser + « prescrire et réaliser ») ──

const inputCls =
  "w-full rounded-xl border border-outline-variant bg-surface-container-lowest px-3 py-2 text-body-md text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:border-primary transition-colors";
const labelCls = "text-label-md font-medium text-on-surface-variant";

export interface RealiserState {
  observations: string;
  complications: string;
  quantiteRealisee: number;
  performedAt: string;
}

export function RealiserFields({
  state,
  onChange,
  maxQuantite,
}: {
  state: RealiserState;
  onChange: (patch: Partial<RealiserState>) => void;
  maxQuantite?: number;
}) {
  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-1">
        <label className={labelCls}>Observations</label>
        <textarea
          className={`${inputCls} resize-none`}
          rows={3}
          value={state.observations}
          onChange={(e) => onChange({ observations: e.target.value })}
          placeholder="Ex : plaie propre, 4 points de suture, désinfection à la bétadine…"
          autoFocus
        />
      </div>
      <div className="flex flex-col gap-1">
        <label className={labelCls}>Complications</label>
        <textarea
          className={`${inputCls} resize-none`}
          rows={2}
          value={state.complications}
          onChange={(e) => onChange({ complications: e.target.value })}
          placeholder="Aucune, sauf mention (optionnel)"
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1">
          <label className={labelCls}>Quantité réalisée</label>
          <input
            type="number"
            min={1}
            max={maxQuantite}
            className={inputCls}
            value={state.quantiteRealisee}
            onChange={(e) => onChange({ quantiteRealisee: Math.max(1, Number(e.target.value) || 1) })}
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className={labelCls}>Heure de réalisation</label>
          <input
            type="datetime-local"
            className={inputCls}
            value={state.performedAt}
            onChange={(e) => onChange({ performedAt: e.target.value })}
          />
        </div>
      </div>
    </div>
  );
}
