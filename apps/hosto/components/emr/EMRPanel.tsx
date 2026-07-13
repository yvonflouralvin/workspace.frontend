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
import { usePermissions } from "@repo/auth/hooks/usePermissions";
import { visibleEmrTabs, type EMRTabKey } from "./emr-tabs";

// Onglets que ce panneau sait rendre (mêmes ids que la page EMR pour reprendre la tab
// déclencheuse à l'ouverture). « hospitalisations » n'est volontairement pas rendu ici.
const SUPPORTED_TABS: readonly EMRTabKey[] = [
  "summary", "history", "allergies", "conditions", "observations",
  "notes", "medications", "prescriptions", "examens", "actes", "timeline",
];

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
  const { can } = usePermissions();
  const visibleTabs = visibleEmrTabs(can, SUPPORTED_TABS);
  const visibleKeys = new Set<string>(visibleTabs.map((t) => t.key));
  const [tab, setTab] = useState<EMRTabKey>(
    initialTab && visibleKeys.has(initialTab) ? (initialTab as EMRTabKey) : "summary",
  );
  const activeTab: EMRTabKey = visibleKeys.has(tab) ? tab : "summary";

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
        {visibleTabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={[
              "px-4 py-2.5 text-body-sm transition-colors -mb-px border-b-2 whitespace-nowrap",
              activeTab === t.key
                ? "border-primary text-primary font-medium"
                : "border-transparent text-on-surface-variant hover:text-on-surface",
            ].join(" ")}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto px-5 py-4">
        {activeTab === "summary" && (
          <SummaryTab summary={summary} loading={summaryLoading} error={summaryError} />
        )}
        {activeTab === "history" && (
          <HistoryTab patientId={num} canWrite={canWrite} onMutation={loadSummary} {...split} />
        )}
        {activeTab === "allergies" && (
          <AllergiesTab patientId={num} canWrite={canWrite} onMutation={loadSummary} {...split} />
        )}
        {activeTab === "conditions" && (
          <ConditionsTab patientId={num} canWrite={canWrite} onMutation={loadSummary} {...split} />
        )}
        {activeTab === "observations" && (
          <VitalsTab patientId={num} canWrite={canWrite} onMutation={loadSummary} {...split} />
        )}
        {activeTab === "notes" && (
          <NotesTab patientId={num} canWrite={canWrite} canSign={canSign} onMutation={loadSummary} {...split} />
        )}
        {activeTab === "medications" && (
          <MedicationsTab patientId={num} canWrite={canWrite} onMutation={loadSummary} {...split} />
        )}
        {activeTab === "prescriptions" && (
          <PrescriptionsPanel patientId={num} {...split} />
        )}
        {activeTab === "examens" && (
          <LabRequestsPanel patientId={num} {...split} />
        )}
        {activeTab === "actes" && (
          <ActesPanel patientId={num} onMutation={loadSummary} {...split} />
        )}
        {activeTab === "timeline" && (
          <TimelineTab patientId={num} />
        )}
      </div>
    </div>
  );
}
