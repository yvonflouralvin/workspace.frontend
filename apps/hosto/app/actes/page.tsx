"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePermissions } from "@repo/auth/hooks/usePermissions";
import { DashboardShell } from "@/components/DashboardShell";
import {
  HealingOutlined,
  LockOutlined,
  PlayCircleOutlineOutlined,
  RefreshOutlined,
  SearchOutlined,
} from "@mui/icons-material";
import {
  getActesFile,
  type ActePrescrit,
  type ActeType,
} from "@/app/lib/actes-api";
import { RealiserDrawer } from "@/components/actes/RealiserDrawer";
import { StatusBadge, PaiementRequisNotice, actorLabel, fmtDateTime } from "@/components/actes/shared";

const POLL_MS = 30_000;

const TYPE_FILTERS: { key: "all" | ActeType; label: string }[] = [
  { key: "all", label: "Tous les types" },
  { key: "MEDICAL", label: "Médical" },
  { key: "INFIRMIER", label: "Infirmier" },
];

function patientName(a: ActePrescrit): string {
  if (!a.patient) return `Patient #${a.patient_id}`;
  return `${a.patient.prenom} ${a.patient.nom}`.trim();
}

function matches(a: ActePrescrit, term: string, type: "all" | ActeType): boolean {
  if (type !== "all" && a.acte_type !== type) return false;
  const t = term.trim().toLowerCase();
  if (!t) return true;
  const hay = `${patientName(a)} ${a.patient?.dossier_number ?? ""} ${a.acte_libelle} ${a.indication ?? ""}`.toLowerCase();
  return hay.includes(t);
}

function WorkCard({
  acte,
  canPerform,
  onRealiser,
}: {
  acte: ActePrescrit;
  canPerform: boolean;
  onRealiser: () => void;
}) {
  return (
    <div className="rounded-2xl border border-outline-variant bg-surface-container-lowest px-5 py-4">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <Link
              href={`/patients/${acte.patient_id}/emr?tab=actes`}
              className="text-body-md font-semibold text-on-surface hover:text-primary transition-colors"
            >
              {patientName(acte)}
            </Link>
            {acte.patient?.dossier_number && (
              <span className="text-label-sm text-on-surface-variant/60">
                {acte.patient.dossier_number}
              </span>
            )}
            <StatusBadge status={acte.status} />
          </div>
          <p className="text-body-sm text-on-surface mt-1">
            {acte.acte_libelle}
            {acte.quantite > 1 && (
              <span className="text-on-surface-variant"> × {acte.quantite}</span>
            )}
          </p>
          {acte.indication && (
            <p className="text-body-sm text-on-surface-variant/80 italic mt-0.5">{acte.indication}</p>
          )}
          <p className="text-label-sm text-on-surface-variant/60 mt-1">
            Prescrit le {fmtDateTime(acte.prescribed_at)} · par{" "}
            {actorLabel(acte.prescribed_by_name, acte.prescribed_by_role, acte.prescribed_by)}
          </p>
        </div>

        {canPerform && acte.status === "REALISABLE" && (
          <button
            type="button"
            onClick={onRealiser}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-secondary text-on-secondary text-body-sm font-medium hover:opacity-90 transition-opacity shrink-0"
          >
            <PlayCircleOutlineOutlined style={{ fontSize: 16 }} />
            Réaliser
          </button>
        )}
      </div>
    </div>
  );
}

export default function ActesFilePage() {
  const { can } = usePermissions();
  const canView = can("hosto.actes.view");
  const canPerform = can("hosto.actes.perform");

  const [items, setItems] = useState<ActePrescrit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | ActeType>("all");
  const [realiserActe, setRealiserActe] = useState<ActePrescrit | null>(null);
  const pollRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = useCallback(
    (silent = false) => {
      if (!canView) return;
      if (!silent) setLoading(true);
      setError(null);
      getActesFile()
        .then(setItems)
        .catch(() => setError("Impossible de charger la file des actes."))
        .finally(() => setLoading(false));
    },
    [canView],
  );

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    function schedule() {
      pollRef.current = setTimeout(() => {
        load(true);
        schedule();
      }, POLL_MS);
    }
    schedule();
    return () => {
      if (pollRef.current) clearTimeout(pollRef.current);
    };
  }, [load]);

  if (!canView) {
    return (
      <DashboardShell>
        <div className="rounded-2xl border border-outline-variant bg-surface-container-lowest p-12 flex flex-col items-center gap-3 text-center">
          <LockOutlined style={{ fontSize: 32 }} className="text-on-surface-variant/30" />
          <p className="text-body-md text-on-surface-variant">Vous n&apos;avez pas accès aux actes.</p>
        </div>
      </DashboardShell>
    );
  }

  const filtered = items.filter((a) => matches(a, search, typeFilter));
  const realisables = filtered.filter((a) => a.status === "REALISABLE");
  const enAttente = filtered.filter((a) => a.status === "EN_ATTENTE_PAIEMENT");

  return (
    <DashboardShell>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-headline-md font-semibold text-on-surface">Actes à réaliser</h1>
            <p className="text-body-sm text-on-surface-variant mt-0.5">
              File de travail des soins et gestes à effectuer.
            </p>
          </div>
          <button
            type="button"
            onClick={() => load()}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-outline-variant text-body-sm text-on-surface-variant hover:bg-surface-container transition-colors"
          >
            <RefreshOutlined style={{ fontSize: 16 }} />
            Actualiser
          </button>
        </div>

        {/* Filtres */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[220px]">
            <SearchOutlined
              style={{ fontSize: 18 }}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant/50"
            />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher un patient, un acte…"
              className="w-full rounded-xl border border-outline-variant bg-surface-container-lowest pl-9 pr-3 py-2 text-body-md text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:border-primary transition-colors"
            />
          </div>
          <div className="flex rounded-xl border border-outline-variant overflow-hidden">
            {TYPE_FILTERS.map((f) => (
              <button
                key={f.key}
                type="button"
                onClick={() => setTypeFilter(f.key)}
                className={`px-3 py-2 text-body-sm transition-colors ${
                  typeFilter === f.key
                    ? "bg-primary text-on-primary"
                    : "text-on-surface-variant hover:bg-surface-container"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {error && (
          <p className="text-body-sm text-error bg-error-container/40 rounded-xl px-4 py-3">{error}</p>
        )}

        {loading ? (
          <div className="space-y-2" aria-busy>
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-24 rounded-2xl bg-surface-container animate-pulse" />
            ))}
          </div>
        ) : (
          <>
            {/* À réaliser */}
            <section className="space-y-2">
              <h2 className="text-body-md font-semibold text-on-surface">
                À réaliser <span className="text-on-surface-variant/60">({realisables.length})</span>
              </h2>
              {realisables.length === 0 ? (
                <div className="rounded-2xl border border-outline-variant bg-surface-container-lowest p-10 flex flex-col items-center gap-2 text-center">
                  <HealingOutlined style={{ fontSize: 28 }} className="text-on-surface-variant/30" />
                  <p className="text-body-sm text-on-surface-variant">Aucun acte à réaliser.</p>
                </div>
              ) : (
                realisables.map((a) => (
                  <WorkCard
                    key={a.id}
                    acte={a}
                    canPerform={canPerform}
                    onRealiser={() => setRealiserActe(a)}
                  />
                ))
              )}
            </section>

            {/* En attente de paiement */}
            {enAttente.length > 0 && (
              <section className="space-y-2">
                <h2 className="text-body-md font-semibold text-on-surface">
                  En attente de paiement{" "}
                  <span className="text-on-surface-variant/60">({enAttente.length})</span>
                </h2>
                <PaiementRequisNotice message="Ces actes ne sont pas réalisables tant que le patient n'a pas réglé. Ils avancent automatiquement dès le paiement enregistré." />
                {enAttente.map((a) => (
                  <WorkCard key={a.id} acte={a} canPerform={canPerform} onRealiser={() => {}} />
                ))}
              </section>
            )}
          </>
        )}
      </div>

      {realiserActe && (
        <RealiserDrawer
          acte={realiserActe}
          onClose={() => setRealiserActe(null)}
          onDone={() => {
            setRealiserActe(null);
            load(true);
          }}
        />
      )}
    </DashboardShell>
  );
}
