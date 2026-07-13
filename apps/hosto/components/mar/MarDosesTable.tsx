"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
import {
  CancelOutlined,
  CheckCircleOutlined,
  DoNotDisturbOnOutlined,
  ExpandMoreOutlined,
  MedicationOutlined,
  NavigateBeforeOutlined,
  NavigateNextOutlined,
  PauseCircleOutlineOutlined,
  ScheduleOutlined,
  SearchOutlined,
  WarningAmberOutlined,
} from "@mui/icons-material";
import type { DoseStatus, DoseSurveillance } from "@/app/lib/surveillance-api";

type DoseMode = "administrer" | "omettre" | "refuser";
type PlanMode = "suspendre" | "reprendre" | "arreter";

// "EN_RETARD" est une surcouche d'affichage sur A_DONNER (dose.en_retard), pas un statut BDD.
type DoseFilter = "ALL" | "EN_RETARD" | DoseStatus;

const STATUS_ORDER: DoseStatus[] = [
  "A_DONNER",
  "DONNEE",
  "OMISE",
  "REFUSEE",
  "SUSPENDUE",
  "ANNULEE",
];

const STATUT_LABEL: Record<DoseStatus, string> = {
  A_DONNER: "À donner",
  DONNEE: "Donnée",
  OMISE: "Omise",
  REFUSEE: "Refusée",
  SUSPENDUE: "Suspendue",
  ANNULEE: "Annulée",
};

const STATUT_CLS: Record<DoseStatus, string> = {
  A_DONNER: "bg-tertiary/10 text-tertiary",
  DONNEE: "bg-secondary/10 text-secondary",
  OMISE: "bg-error-container text-error",
  REFUSEE: "bg-error-container text-error",
  SUSPENDUE: "bg-surface-container text-on-surface-variant/60",
  ANNULEE: "bg-surface-container text-on-surface-variant/60",
};

const STATUT_ICON: Record<DoseStatus, React.ReactNode> = {
  A_DONNER: <ScheduleOutlined style={{ fontSize: 13 }} />,
  DONNEE: <CheckCircleOutlined style={{ fontSize: 13 }} />,
  OMISE: <DoNotDisturbOnOutlined style={{ fontSize: 13 }} />,
  REFUSEE: <CancelOutlined style={{ fontSize: 13 }} />,
  SUSPENDUE: <PauseCircleOutlineOutlined style={{ fontSize: 13 }} />,
  ANNULEE: <CancelOutlined style={{ fontSize: 13 }} />,
};

const PER_PAGE = 10;

const pillCls =
  "inline-flex items-center gap-1 text-label-sm px-2 py-0.5 rounded-full font-medium shrink-0";

function isEnRetard(dose: DoseSurveillance): boolean {
  return dose.en_retard && dose.status === "A_DONNER";
}

function heureFr(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
}

function doseLine(dose: DoseSurveillance): string {
  const qty = dose.dose_quantite != null ? `${dose.dose_quantite} ${dose.dose_unite ?? ""}`.trim() : "";
  return [qty, dose.voie].filter(Boolean).join(" · ");
}

function MarStatusBadge({ dose }: { dose: DoseSurveillance }) {
  if (isEnRetard(dose)) {
    return (
      <span className={`${pillCls} bg-error-container text-error`}>
        <WarningAmberOutlined style={{ fontSize: 13 }} />
        En retard
      </span>
    );
  }
  return (
    <span className={`${pillCls} ${STATUT_CLS[dose.status]}`}>
      {STATUT_ICON[dose.status]}
      {STATUT_LABEL[dose.status]}
    </span>
  );
}

// ─── Détail déplié ──────────────────────────────────────────────────────────────

function DoseDetail({
  dose,
  canAdminister,
  canManagePlan,
  onAction,
  onPlan,
}: {
  dose: DoseSurveillance;
  canAdminister: boolean;
  canManagePlan: boolean;
  onAction: (dose: DoseSurveillance, mode: DoseMode) => void;
  onPlan: (planId: number, mode: PlanMode) => void;
}) {
  const traitee = ["DONNEE", "OMISE", "REFUSEE"].includes(dose.status);
  const inactive = ["SUSPENDUE", "ANNULEE"].includes(dose.status);
  const canActOnDose = canAdminister && dose.status === "A_DONNER";
  const canActOnPlan = canManagePlan && (dose.status === "A_DONNER" || dose.status === "SUSPENDUE");

  return (
    <div className="px-4 py-4 space-y-3 bg-surface-container-low/40">
      <div className="grid gap-x-6 gap-y-2 sm:grid-cols-2">
        <div>
          <p className="text-label-sm text-on-surface-variant/70">Prévue à</p>
          <p className="text-body-sm text-on-surface">{dose.heure || "—"}</p>
        </div>
        {doseLine(dose) && (
          <div>
            <p className="text-label-sm text-on-surface-variant/70">Dose</p>
            <p className="text-body-sm text-on-surface">{doseLine(dose)}</p>
          </div>
        )}
      </div>

      {dose.status === "DONNEE" && (
        <div className="rounded-xl bg-secondary/5 border border-secondary/20 px-4 py-3">
          <p className="text-body-sm text-secondary font-medium">
            Donnée à {heureFr(dose.administered_at)}
            {dose.dose_reelle != null ? ` · ${dose.dose_reelle} ${dose.dose_unite ?? ""}` : ""}
          </p>
          {dose.observations && (
            <p className="text-body-sm text-on-surface mt-1">{dose.observations}</p>
          )}
        </div>
      )}

      {(dose.status === "OMISE" || dose.status === "REFUSEE") && (
        <p className="text-body-sm text-error">
          <span className="font-medium">{STATUT_LABEL[dose.status]}</span>
          {dose.motif ? ` — ${dose.motif}` : ""}
        </p>
      )}

      {inactive && dose.motif && (
        <p className="text-body-sm text-on-surface-variant/90 italic">{dose.motif}</p>
      )}

      {canActOnDose && (
        <div className="flex items-center gap-2 flex-wrap pt-1">
          <button
            type="button"
            onClick={() => onAction(dose, "administrer")}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-secondary text-on-secondary text-body-sm font-medium hover:opacity-90 transition-opacity"
          >
            Administrer
          </button>
          <button
            type="button"
            onClick={() => onAction(dose, "omettre")}
            className="px-3 py-1.5 rounded-xl border border-outline-variant text-body-sm text-on-surface-variant hover:bg-surface-container transition-colors"
          >
            Omettre
          </button>
          <button
            type="button"
            onClick={() => onAction(dose, "refuser")}
            className="px-3 py-1.5 rounded-xl border border-outline-variant text-body-sm text-on-surface-variant hover:bg-surface-container transition-colors"
          >
            Refus
          </button>
        </div>
      )}

      {canActOnPlan && (
        <div className="flex gap-3 text-label-md pt-0.5">
          {dose.status === "SUSPENDUE" ? (
            <button
              type="button"
              onClick={() => onPlan(dose.plan_id, "reprendre")}
              className="text-tertiary hover:underline"
            >
              Reprendre le traitement
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={() => onPlan(dose.plan_id, "suspendre")}
                className="text-on-surface-variant hover:text-tertiary hover:underline"
              >
                Suspendre le traitement
              </button>
              <button
                type="button"
                onClick={() => onPlan(dose.plan_id, "arreter")}
                className="text-on-surface-variant hover:text-error hover:underline"
              >
                Arrêter
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Tableau des doses ──────────────────────────────────────────────────────────

export function MarDosesTable({
  doses,
  canAdminister,
  canManagePlan,
  onAction,
  onPlan,
}: {
  doses: DoseSurveillance[];
  canAdminister: boolean;
  canManagePlan: boolean;
  onAction: (dose: DoseSurveillance, mode: DoseMode) => void;
  onPlan: (planId: number, mode: PlanMode) => void;
}) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<DoseFilter>("ALL");
  const [page, setPage] = useState(1);
  const [expandedId, setExpandedId] = useState<number | null>(null);

  // Tri chronologique (matin → soir), comme la feuille de surveillance d'origine.
  const sorted = useMemo(
    () =>
      [...doses].sort((a, b) =>
        (a.scheduled_at ?? a.heure).localeCompare(b.scheduled_at ?? b.heure),
      ),
    [doses],
  );

  const searched = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return sorted;
    return sorted.filter(
      (d) =>
        d.medication_name.toLowerCase().includes(q) ||
        (d.voie?.toLowerCase().includes(q) ?? false) ||
        (d.motif?.toLowerCase().includes(q) ?? false),
    );
  }, [sorted, search]);

  const counts = useMemo(() => {
    const c: Record<DoseFilter, number> = {
      ALL: searched.length,
      EN_RETARD: 0,
      A_DONNER: 0,
      DONNEE: 0,
      OMISE: 0,
      REFUSEE: 0,
      SUSPENDUE: 0,
      ANNULEE: 0,
    };
    for (const d of searched) {
      c[d.status] += 1;
      if (isEnRetard(d)) c.EN_RETARD += 1;
    }
    return c;
  }, [searched]);

  const filtered = useMemo(() => {
    if (statusFilter === "ALL") return searched;
    if (statusFilter === "EN_RETARD") return searched.filter(isEnRetard);
    return searched.filter((d) => d.status === statusFilter);
  }, [searched, statusFilter]);

  useEffect(() => {
    setPage(1);
  }, [search, statusFilter]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const current = Math.min(page, pageCount);
  const start = (current - 1) * PER_PAGE;
  const pageItems = filtered.slice(start, start + PER_PAGE);

  const toggle = (id: number) => setExpandedId((prev) => (prev === id ? null : id));

  const filterOptions: { key: DoseFilter; label: string }[] = [
    { key: "ALL", label: "Toutes" },
    { key: "EN_RETARD", label: "En retard" },
    ...STATUS_ORDER.map((s) => ({ key: s as DoseFilter, label: STATUT_LABEL[s] })),
  ];

  return (
    <div className="space-y-3">
      {/* ── Barre d'outils : recherche + filtres statut ── */}
      <div className="flex flex-col gap-3">
        <div className="relative">
          <SearchOutlined
            style={{ fontSize: 18 }}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant/50 pointer-events-none"
          />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher un médicament, une voie…"
            className="w-full rounded-xl border border-outline-variant bg-surface-container-lowest pl-10 pr-3 py-2 text-body-md text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:border-primary transition-colors"
          />
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          {filterOptions.map((opt) => {
            const active = statusFilter === opt.key;
            const count = counts[opt.key];
            return (
              <button
                key={opt.key}
                type="button"
                onClick={() => setStatusFilter(opt.key)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-body-sm transition-colors border ${
                  active
                    ? "bg-primary text-on-primary border-primary"
                    : "border-outline-variant text-on-surface-variant hover:bg-surface-container"
                }`}
              >
                {opt.label}
                <span
                  className={`text-label-sm ${active ? "text-on-primary/80" : "text-on-surface-variant/60"}`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Contenu ── */}
      {doses.length === 0 ? (
        <div className="rounded-2xl border border-outline-variant bg-surface-container-lowest p-10 flex flex-col items-center gap-2 text-center">
          <MedicationOutlined style={{ fontSize: 28 }} className="text-on-surface-variant/30" />
          <p className="text-body-md text-on-surface-variant">Aucune dose planifiée aujourd&apos;hui.</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-outline-variant bg-surface-container-lowest p-10 flex flex-col items-center gap-2 text-center">
          <SearchOutlined style={{ fontSize: 28 }} className="text-on-surface-variant/30" />
          <p className="text-body-md text-on-surface-variant">Aucune dose ne correspond aux filtres.</p>
        </div>
      ) : (
        <div className="rounded-2xl border border-outline-variant bg-surface-container-lowest overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-outline-variant text-label-md text-on-surface-variant">
                <th className="px-4 py-3 font-medium whitespace-nowrap">Heure</th>
                <th className="px-4 py-3 font-medium">Médicament</th>
                <th className="px-4 py-3 font-medium whitespace-nowrap">Statut</th>
                <th className="px-2 py-3 w-10" aria-label="Détails" />
              </tr>
            </thead>
            <tbody>
              {pageItems.map((dose) => {
                const isOpen = expandedId === dose.id;
                const dimmed = ["SUSPENDUE", "ANNULEE"].includes(dose.status);
                return (
                  <Fragment key={dose.id}>
                    <tr
                      onClick={() => toggle(dose.id)}
                      className={`border-b border-outline-variant cursor-pointer transition-colors ${
                        isOpen ? "bg-surface-container-low" : "hover:bg-surface-container-low/60"
                      }`}
                      aria-expanded={isOpen}
                    >
                      <td className="px-4 py-3 text-body-sm text-on-surface-variant whitespace-nowrap align-top tabular-nums">
                        {dose.heure || "—"}
                      </td>
                      <td className="px-4 py-3 align-top">
                        <span className={`text-body-md text-on-surface ${dimmed ? "opacity-70" : ""}`}>
                          {dose.medication_name}
                        </span>
                        {doseLine(dose) && (
                          <span className="block text-label-sm text-on-surface-variant mt-0.5">
                            {doseLine(dose)}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 align-top whitespace-nowrap">
                        <MarStatusBadge dose={dose} />
                      </td>
                      <td className="px-2 py-3 align-top text-right">
                        <ExpandMoreOutlined
                          style={{ fontSize: 20 }}
                          className={`text-on-surface-variant/50 transition-transform ${isOpen ? "rotate-180" : ""}`}
                        />
                      </td>
                    </tr>
                    {isOpen && (
                      <tr className="border-b border-outline-variant">
                        <td colSpan={4} className="p-0">
                          <DoseDetail
                            dose={dose}
                            canAdminister={canAdminister}
                            canManagePlan={canManagePlan}
                            onAction={onAction}
                            onPlan={onPlan}
                          />
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>

          {/* ── Pagination ── */}
          {filtered.length > PER_PAGE && (
            <div className="flex items-center justify-between gap-3 px-4 py-3 border-t border-outline-variant">
              <p className="text-body-sm text-on-surface-variant">
                {start + 1}–{Math.min(start + PER_PAGE, filtered.length)} sur {filtered.length}
              </p>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={current <= 1}
                  className="inline-flex items-center justify-center h-8 w-8 rounded-lg border border-outline-variant text-on-surface-variant hover:bg-surface-container disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  aria-label="Page précédente"
                >
                  <NavigateBeforeOutlined style={{ fontSize: 18 }} />
                </button>
                <span className="text-body-sm text-on-surface-variant px-2 tabular-nums">
                  {current} / {pageCount}
                </span>
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
                  disabled={current >= pageCount}
                  className="inline-flex items-center justify-center h-8 w-8 rounded-lg border border-outline-variant text-on-surface-variant hover:bg-surface-container disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  aria-label="Page suivante"
                >
                  <NavigateNextOutlined style={{ fontSize: 18 }} />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
