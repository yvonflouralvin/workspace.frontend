"use client";
import { useCallback, useEffect, useState, type ReactNode } from "react";
import { VitalsTab } from "./VitalsTab";
import { NotesTab } from "./NotesTab";
import { ConditionsTab } from "./ConditionsTab";
import { AllergiesTab } from "./AllergiesTab";
import { HistoryTab } from "./HistoryTab";
import { MedicationsTab } from "./MedicationsTab";
import { SummaryTab } from "./SummaryTab";
import { TimelineTab } from "./TimelineTab";
import { AllergyBanner } from "./AllergyBanner";
import { PrescriptionsPanel } from "@/components/prescriptions/PrescriptionsPanel";
import { LabRequestsPanel } from "@/components/lab/LabRequestsPanel";
import { ActesPanel } from "@/components/actes/ActesPanel";
import { getPatientSummary, type EMRSummary } from "@/app/lib/emr-api";

// Mêmes ids que la page EMR pour que la tab déclencheuse soit reprise à l'ouverture.
export type EMRPanelTab =
  | "summary" | "history" | "allergies" | "conditions" | "observations"
  | "notes" | "medications" | "prescriptions" | "examens" | "actes" | "timeline";

const TABS: { id: EMRPanelTab; label: string }[] = [
  { id: "summary",       label: "Résumé" },
  { id: "history",       label: "Antécédents" },
  { id: "allergies",     label: "Allergies" },
  { id: "conditions",    label: "Problèmes" },
  { id: "observations",  label: "Constantes" },
  { id: "notes",         label: "Notes" },
  { id: "medications",   label: "Traitements" },
  { id: "prescriptions", label: "Prescriptions" },
  { id: "examens",       label: "Examens" },
  { id: "actes",         label: "Actes" },
  { id: "timeline",      label: "Timeline" },
];

const VALID = new Set<string>(TABS.map((t) => t.id));

export function EMRPanel({
  patientId,
  patientName,
  initialTab,
  canWrite = false,
  canSign = false,
  onSplit,
  onCloseSplit,
}: {
  patientId: number;
  patientName?: string;
  initialTab?: string;
  canWrite?: boolean;
  canSign?: boolean;
  // Fournis quand le panneau est le volet gauche d'un SplitWorkspace : « ajouter »
  // remplace le volet droit (au lieu d'empiler un RightDrawer par-dessus le split).
  onSplit?: (title: string, content: ReactNode) => void;
  onCloseSplit?: () => void;
}) {
  const [tab, setTab] = useState<EMRPanelTab>(
    initialTab && VALID.has(initialTab) ? (initialTab as EMRPanelTab) : "summary",
  );

  const [summary, setSummary] = useState<EMRSummary | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [summaryError, setSummaryError] = useState<string | null>(null);

  const loadSummary = useCallback(() => {
    getPatientSummary(patientId)
      .then(setSummary)
      .catch(() => setSummaryError("Impossible de charger le résumé."))
      .finally(() => setSummaryLoading(false));
  }, [patientId]);

  useEffect(() => { loadSummary(); }, [loadSummary]);

  const num = Number(patientId);
  const split = { onSplit, onCloseSplit } as const;

  return (
    <div className="flex flex-col h-full min-h-0">
      {patientName && (
        <div className="shrink-0 px-5 py-3 border-b border-outline-variant bg-surface-container-lowest">
          <p className="text-body-sm font-semibold text-on-surface">{patientName}</p>
          <p className="text-label-sm text-on-surface-variant">Dossier médical complet</p>
        </div>
      )}

      <div className="shrink-0 px-5 pt-3">
        <AllergyBanner allergies={summary?.active_allergies ?? []} />
      </div>

      <div className="shrink-0 flex gap-0 border-b border-outline-variant bg-surface-container-lowest overflow-x-auto mt-2">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={[
              "px-4 py-2.5 text-body-sm transition-colors -mb-px border-b-2 whitespace-nowrap",
              tab === t.id
                ? "border-primary text-primary font-medium"
                : "border-transparent text-on-surface-variant hover:text-on-surface",
            ].join(" ")}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto px-5 py-4">
        {tab === "summary" && (
          <SummaryTab summary={summary} loading={summaryLoading} error={summaryError} />
        )}
        {tab === "history" && (
          <HistoryTab patientId={num} canWrite={canWrite} onMutation={loadSummary} {...split} />
        )}
        {tab === "allergies" && (
          <AllergiesTab patientId={num} canWrite={canWrite} onMutation={loadSummary} {...split} />
        )}
        {tab === "conditions" && (
          <ConditionsTab patientId={num} canWrite={canWrite} onMutation={loadSummary} {...split} />
        )}
        {tab === "observations" && (
          <VitalsTab patientId={num} canWrite={canWrite} onMutation={loadSummary} {...split} />
        )}
        {tab === "notes" && (
          <NotesTab patientId={num} canWrite={canWrite} canSign={canSign} onMutation={loadSummary} {...split} />
        )}
        {tab === "medications" && (
          <MedicationsTab patientId={num} canWrite={canWrite} onMutation={loadSummary} {...split} />
        )}
        {tab === "prescriptions" && (
          <PrescriptionsPanel patientId={num} {...split} />
        )}
        {tab === "examens" && (
          <LabRequestsPanel patientId={num} {...split} />
        )}
        {tab === "actes" && (
          <ActesPanel patientId={num} onMutation={loadSummary} {...split} />
        )}
        {tab === "timeline" && (
          <TimelineTab patientId={num} />
        )}
      </div>
    </div>
  );
}
