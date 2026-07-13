"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
import {
  BlockOutlined,
  ExpandMoreOutlined,
  HealingOutlined,
  NavigateBeforeOutlined,
  NavigateNextOutlined,
  PlayCircleOutlineOutlined,
  SearchOutlined,
} from "@mui/icons-material";
import type { ActePrescrit, ActePrescritStatus } from "@/app/lib/actes-api";
import {
  StatusBadge,
  STATUS_LABEL,
  PaiementRequisNotice,
  actorLabel,
  fmtDate,
  fmtDateTime,
} from "./shared";

const STATUS_ORDER: ActePrescritStatus[] = [
  "PRESCRIT",
  "EN_ATTENTE_PAIEMENT",
  "REALISABLE",
  "REALISE",
  "ANNULE",
];

const PER_PAGE = 10;

type StatusFilter = ActePrescritStatus | "ALL";

// Date canonique d'un acte (même règle de tri que la liste) : prescription, repli création.
function acteDate(acte: ActePrescrit): string | null {
  return acte.prescribed_at ?? acte.created_at;
}

// ─── Détail déplié ──────────────────────────────────────────────────────────────

function ActeDetail({
  acte,
  canPrescribe,
  canPerform,
  onRealiser,
  onAnnuler,
}: {
  acte: ActePrescrit;
  canPrescribe: boolean;
  canPerform: boolean;
  onRealiser: (acte: ActePrescrit) => void;
  onAnnuler: (acte: ActePrescrit) => void;
}) {
  const canCancel =
    canPrescribe &&
    (acte.status === "PRESCRIT" ||
      acte.status === "REALISABLE" ||
      acte.status === "EN_ATTENTE_PAIEMENT");

  return (
    <div className="px-4 py-4 space-y-3 bg-surface-container-low/40">
      <div className="grid gap-x-6 gap-y-2 sm:grid-cols-2">
        <div>
          <p className="text-label-sm text-on-surface-variant/70">Prescrit</p>
          <p className="text-body-sm text-on-surface">
            {fmtDate(acte.prescribed_at)} · par{" "}
            {actorLabel(acte.prescribed_by_name, acte.prescribed_by_role, acte.prescribed_by)}
          </p>
        </div>
        {acte.quantite > 1 && (
          <div>
            <p className="text-label-sm text-on-surface-variant/70">Quantité</p>
            <p className="text-body-sm text-on-surface">× {acte.quantite}</p>
          </div>
        )}
        {acte.indication && (
          <div className="sm:col-span-2">
            <p className="text-label-sm text-on-surface-variant/70">Indication</p>
            <p className="text-body-sm text-on-surface-variant/90 italic">{acte.indication}</p>
          </div>
        )}
      </div>

      {acte.status === "EN_ATTENTE_PAIEMENT" && (
        <PaiementRequisNotice message="Cet acte ne peut pas encore être réalisé : le patient doit d'abord régler le paiement." />
      )}

      {acte.status === "REALISE" && acte.realise && (
        <div className="rounded-xl bg-secondary/5 border border-secondary/20 px-4 py-3">
          <p className="text-body-sm text-secondary font-medium">
            Réalisé le {fmtDateTime(acte.realise.performed_at)} · par{" "}
            {actorLabel(
              acte.realise.performed_by_name,
              acte.realise.performed_by_role,
              acte.realise.performed_by,
            )}
          </p>
          {acte.realise.observations && (
            <p className="text-body-sm text-on-surface mt-1">{acte.realise.observations}</p>
          )}
          {acte.realise.complications && (
            <p className="text-body-sm text-error mt-1">
              <span className="font-medium">Complications :</span> {acte.realise.complications}
            </p>
          )}
        </div>
      )}

      {(canCancel || (canPerform && acte.status === "REALISABLE")) && (
        <div className="flex items-center gap-2 flex-wrap pt-1">
          {canPerform && acte.status === "REALISABLE" && (
            <button
              type="button"
              onClick={() => onRealiser(acte)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-secondary text-on-secondary text-body-sm font-medium hover:opacity-90 transition-opacity"
            >
              <PlayCircleOutlineOutlined style={{ fontSize: 16 }} />
              Réaliser
            </button>
          )}
          {canCancel && (
            <button
              type="button"
              onClick={() => onAnnuler(acte)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-error/40 text-error text-body-sm hover:bg-error/8 transition-colors"
            >
              <BlockOutlined style={{ fontSize: 15 }} />
              Annuler
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Tableau des actes ──────────────────────────────────────────────────────────

export function ActesTable({
  items,
  loading,
  canPrescribe,
  canPerform,
  onRealiser,
  onAnnuler,
  onPrescribe,
}: {
  items: ActePrescrit[];
  loading: boolean;
  canPrescribe: boolean;
  canPerform: boolean;
  onRealiser: (acte: ActePrescrit) => void;
  onAnnuler: (acte: ActePrescrit) => void;
  onPrescribe: () => void;
}) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  const [page, setPage] = useState(1);
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const searched = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter(
      (a) =>
        a.acte_libelle.toLowerCase().includes(q) ||
        (a.indication?.toLowerCase().includes(q) ?? false),
    );
  }, [items, search]);

  const counts = useMemo(() => {
    const c: Record<StatusFilter, number> = {
      ALL: searched.length,
      PRESCRIT: 0,
      EN_ATTENTE_PAIEMENT: 0,
      REALISABLE: 0,
      REALISE: 0,
      ANNULE: 0,
    };
    for (const a of searched) c[a.status] += 1;
    return c;
  }, [searched]);

  const filtered = useMemo(
    () => (statusFilter === "ALL" ? searched : searched.filter((a) => a.status === statusFilter)),
    [searched, statusFilter],
  );

  // Revenir en page 1 quand la recherche/le filtre change le jeu de résultats.
  useEffect(() => {
    setPage(1);
  }, [search, statusFilter]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const current = Math.min(page, pageCount);
  const start = (current - 1) * PER_PAGE;
  const pageItems = filtered.slice(start, start + PER_PAGE);

  const toggle = (id: number) => setExpandedId((prev) => (prev === id ? null : id));

  // Onglets de filtre statut (avec compteur), « Tous » en tête.
  const filterOptions: { key: StatusFilter; label: string }[] = [
    { key: "ALL", label: "Tous" },
    ...STATUS_ORDER.map((s) => ({ key: s as StatusFilter, label: STATUS_LABEL[s] })),
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
            placeholder="Rechercher un acte, une indication…"
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
      {loading ? (
        <div className="rounded-2xl border border-outline-variant bg-surface-container-lowest divide-y divide-outline-variant" aria-busy>
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="px-4 py-3.5">
              <div className="h-4 w-56 rounded bg-surface-container animate-pulse" />
            </div>
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-2xl border border-outline-variant bg-surface-container-lowest p-12 flex flex-col items-center gap-3 text-center">
          <HealingOutlined style={{ fontSize: 32 }} className="text-on-surface-variant/30" />
          <p className="text-body-md text-on-surface-variant">Aucun acte.</p>
          {canPrescribe && (
            <button
              type="button"
              onClick={onPrescribe}
              className="text-body-sm text-primary underline underline-offset-2 hover:opacity-70 transition-opacity"
            >
              Prescrire un acte
            </button>
          )}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-outline-variant bg-surface-container-lowest p-10 flex flex-col items-center gap-2 text-center">
          <SearchOutlined style={{ fontSize: 28 }} className="text-on-surface-variant/30" />
          <p className="text-body-md text-on-surface-variant">Aucun acte ne correspond aux filtres.</p>
        </div>
      ) : (
        <div className="rounded-2xl border border-outline-variant bg-surface-container-lowest overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-outline-variant text-label-md text-on-surface-variant">
                <th className="px-4 py-3 font-medium whitespace-nowrap">Date</th>
                <th className="px-4 py-3 font-medium">Nom de l&apos;acte</th>
                <th className="px-4 py-3 font-medium whitespace-nowrap">Statut</th>
                <th className="px-2 py-3 w-10" aria-label="Détails" />
              </tr>
            </thead>
            <tbody>
              {pageItems.map((acte) => {
                const isOpen = expandedId === acte.id;
                const isCancelled = acte.status === "ANNULE";
                return (
                  <Fragment key={acte.id}>
                    <tr
                      onClick={() => toggle(acte.id)}
                      className={`border-b border-outline-variant cursor-pointer transition-colors ${
                        isOpen ? "bg-surface-container-low" : "hover:bg-surface-container-low/60"
                      }`}
                      aria-expanded={isOpen}
                    >
                      <td className="px-4 py-3 text-body-sm text-on-surface-variant whitespace-nowrap align-top">
                        {fmtDate(acteDate(acte))}
                      </td>
                      <td className="px-4 py-3 align-top">
                        <span
                          className={`text-body-md text-on-surface ${isCancelled ? "line-through opacity-70" : ""}`}
                        >
                          {acte.acte_libelle}
                        </span>
                        {acte.quantite > 1 && (
                          <span className="text-label-sm text-on-surface-variant ml-1.5">
                            × {acte.quantite}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 align-top whitespace-nowrap">
                        <StatusBadge status={acte.status} />
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
                          <ActeDetail
                            acte={acte}
                            canPrescribe={canPrescribe}
                            canPerform={canPerform}
                            onRealiser={onRealiser}
                            onAnnuler={onAnnuler}
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
