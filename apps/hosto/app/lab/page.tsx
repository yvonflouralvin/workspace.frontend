"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePermissions } from "@repo/auth/hooks/usePermissions";
import { DashboardShell } from "@/components/DashboardShell";
import {
  type LabRequest,
  type LabRequestStatus,
  getLabQueue,
} from "@/app/lib/lab-api";
import { RequestTable } from "@/components/laboratory/RequestTable";
import { CollectDrawer } from "@/components/laboratory/CollectDrawer";
import { ResultsDrawer } from "@/components/laboratory/ResultsDrawer";
import { ValidationDrawer } from "@/components/laboratory/ValidationDrawer";
import { BiotechOutlined, RefreshOutlined, SearchOutlined } from "@mui/icons-material";

const POLL_MS = 20_000;

type WorkTab = "prelever" | "resulter" | "valider";

const ACTIVE_STATUSES: LabRequestStatus[] = ["DEMANDE", "PARTIELLEMENT_PRELEVE", "PRELEVE", "EN_ANALYSE"];

function matchesSearch(req: LabRequest, term: string): boolean {
  const t = term.trim().toLowerCase();
  if (!t) return true;
  const patient = `${req.patient?.prenom ?? ""} ${req.patient?.nom ?? ""} ${req.patient?.dossier_number ?? ""}`.toLowerCase();
  const exams = req.items.map((i) => i.lab_test_name_cache).join(" ").toLowerCase();
  return patient.includes(t) || exams.includes(t);
}

export default function LaboratoryPage() {
  const { can } = usePermissions();
  const canView       = can("hosto.lab.view");
  const canTechnician = can("hosto.lab.technician");
  const canValidate   = can("hosto.lab.validate");

  const [tab, setTab]               = useState<WorkTab>("prelever");
  const [demande, setDemande]       = useState<LabRequest[]>([]);
  const [analyse, setAnalyse]       = useState<LabRequest[]>([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState<string | null>(null);
  const [urgentOnly, setUrgentOnly] = useState(false);
  const [search, setSearch]         = useState("");

  const [collectTarget, setCollectTarget]     = useState<LabRequest | null>(null);
  const [resultsTarget, setResultsTarget]     = useState<LabRequest | null>(null);
  const [validationTarget, setValidationTarget] = useState<LabRequest | null>(null);

  const pollRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = useCallback(async (silent = false) => {
    if (!canView) { setLoading(false); return; }
    if (!silent) setLoading(true);
    setError(null);
    try {
      const res = await getLabQueue({
        status: ACTIVE_STATUSES,
        priority: urgentOnly ? "URGENT" : undefined,
        per_page: 100,
      });
      setDemande(res.items.filter((r) => r.status === "DEMANDE" || r.status === "PARTIELLEMENT_PRELEVE"));
      setAnalyse(res.items.filter((r) => r.status === "PARTIELLEMENT_PRELEVE" || r.status === "PRELEVE" || r.status === "EN_ANALYSE"));
    } catch {
      if (!silent) setError("Impossible de charger la file laboratoire.");
    } finally {
      if (!silent) setLoading(false);
    }
  }, [canView, urgentOnly]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    function schedule() {
      pollRef.current = setTimeout(() => { load(true); schedule(); }, POLL_MS);
    }
    schedule();
    return () => { if (pollRef.current) clearTimeout(pollRef.current); };
  }, [load]);

  // "À valider" = demandes EN_ANALYSE qui ont des items RESULTAT_SAISI
  const valider = analyse.filter((r) =>
    r.items.some((i) => i.status === "RESULTAT_SAISI"),
  );

  const demandeF = demande.filter((r) => matchesSearch(r, search));
  const analyseF = analyse.filter((r) => matchesSearch(r, search));
  const validerF = valider.filter((r) => matchesSearch(r, search));

  const tabCounts: Record<WorkTab, number> = {
    prelever: demande.length,
    resulter: analyse.length,
    valider:  valider.length,
  };

  function handleDone() {
    setCollectTarget(null);
    setResultsTarget(null);
    setValidationTarget(null);
    load();
  }

  if (!canView) {
    return (
      <DashboardShell>
        <div className="p-8 text-center text-on-surface-variant">Accès non autorisé.</div>
      </DashboardShell>
    );
  }

  const totalActive = demande.length + analyse.length;

  return (
    <DashboardShell>
      <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-5">

        {/* Header */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <BiotechOutlined style={{ fontSize: 28 }} className="text-primary" />
            <div>
              <h1 className="text-headline-sm font-display text-on-surface">Laboratoire</h1>
              <p className="text-body-sm text-on-surface-variant mt-0.5">
                {totalActive} demande{totalActive !== 1 ? "s" : ""} active{totalActive !== 1 ? "s" : ""}
                {valider.length > 0 && ` · ${valider.length} à valider`}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setUrgentOnly((v) => !v)}
              className={`px-3 py-2 rounded-xl text-body-sm border transition-colors ${
                urgentOnly
                  ? "bg-error/10 border-error/30 text-error font-medium"
                  : "border-outline-variant text-on-surface-variant hover:bg-surface-container"
              }`}>
              Urgent seulement
            </button>
            <button
              onClick={() => load()}
              title="Rafraîchir"
              className="p-2 rounded-xl text-on-surface-variant hover:bg-surface-container transition-colors">
              <RefreshOutlined style={{ fontSize: 20 }} />
            </button>
          </div>
        </div>

        {error && (
          <p className="text-body-sm text-error bg-error-container/40 rounded-xl px-4 py-3">{error}</p>
        )}

        {/* Tabs de workflow */}
        <div className="flex gap-1 border-b border-outline-variant">
          {(["prelever", "resulter", "valider"] as WorkTab[]).map((t) => {
            const labels: Record<WorkTab, string> = {
              prelever: "À prélever",
              resulter: "À résulter",
              valider:  "À valider",
            };
            return (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`px-4 py-2.5 text-body-sm font-medium border-b-2 -mb-px transition-colors ${
                  tab === t
                    ? "border-primary text-primary"
                    : "border-transparent text-on-surface-variant hover:text-on-surface"
                }`}>
                {labels[t]}
                <span className={`ml-1.5 px-1.5 py-0.5 rounded-full text-label-xs tabular-nums ${
                  t === "valider" && tabCounts[t] > 0
                    ? "bg-error/10 text-error"
                    : "bg-surface-container text-on-surface-variant"
                }`}>
                  {tabCounts[t]}
                </span>
              </button>
            );
          })}
        </div>

        {/* Recherche */}
        <div className="relative">
          <SearchOutlined
            style={{ fontSize: 18 }}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant pointer-events-none"
          />
          <input
            type="search"
            placeholder="Rechercher un patient ou un examen…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-xl border border-outline-variant bg-surface-container-lowest text-body-md text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:border-primary transition-colors"
          />
        </div>

        {/* Contenu */}
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 rounded-2xl bg-surface-container animate-pulse" />
            ))}
          </div>
        ) : (
          <>
            {tab === "prelever" && (
              <RequestTable
                rows={demandeF}
                actionLabel="Prélever"
                actionDisabled={!canTechnician}
                onAction={(r) => setCollectTarget(r)}
                emptyMessage={search ? "Aucun résultat pour cette recherche." : "Aucune demande à prélever."}
              />
            )}

            {tab === "resulter" && (
              <RequestTable
                rows={analyseF}
                actionLabel="Saisir les résultats"
                actionDisabled={!canTechnician}
                onAction={(r) => setResultsTarget(r)}
                emptyMessage={search ? "Aucun résultat pour cette recherche." : "Aucune demande à résulter."}
              />
            )}

            {tab === "valider" && (
              <RequestTable
                rows={validerF}
                actionLabel={canValidate ? "Valider" : "Voir les résultats"}
                onAction={(r) => setValidationTarget(r)}
                emptyMessage={search ? "Aucun résultat pour cette recherche." : "Aucun résultat en attente de validation."}
              />
            )}
          </>
        )}
      </div>

      {/* Drawers */}
      {collectTarget && (
        <CollectDrawer
          req={collectTarget}
          onClose={() => setCollectTarget(null)}
          onDone={handleDone}
        />
      )}
      {resultsTarget && (
        <ResultsDrawer
          req={resultsTarget}
          onClose={() => setResultsTarget(null)}
          onDone={handleDone}
          canTechnician={canTechnician}
        />
      )}
      {validationTarget && (
        <ValidationDrawer
          req={validationTarget}
          onClose={() => setValidationTarget(null)}
          onDone={handleDone}
          canValidate={canValidate}
        />
      )}
    </DashboardShell>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center gap-3 py-16 text-center">
      <BiotechOutlined style={{ fontSize: 40 }} className="text-outline" />
      <p className="text-body-md text-on-surface-variant">{message}</p>
    </div>
  );
}
