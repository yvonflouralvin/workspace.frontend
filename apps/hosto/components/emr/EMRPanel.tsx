"use client";
import { useState } from "react";
import { VitalsTab } from "./VitalsTab";
import { NotesTab } from "./NotesTab";
import { ConditionsTab } from "./ConditionsTab";
import { AllergiesTab } from "./AllergiesTab";
import { PrescriptionsPanel } from "@/components/prescriptions/PrescriptionsPanel";

type EMRTab = "constantes" | "notes" | "diagnostics" | "ordonnances" | "allergies";

const TABS: { id: EMRTab; label: string }[] = [
  { id: "constantes",  label: "Constantes" },
  { id: "notes",       label: "Notes" },
  { id: "diagnostics", label: "Diagnostics" },
  { id: "ordonnances", label: "Ordonnances" },
  { id: "allergies",   label: "Allergies" },
];

export function EMRPanel({
  patientId,
  patientName,
}: {
  patientId: number;
  patientName?: string;
}) {
  const [tab, setTab] = useState<EMRTab>("constantes");

  return (
    <div className="flex flex-col h-full min-h-0">
      {patientName && (
        <div className="shrink-0 px-5 py-3 border-b border-outline-variant bg-surface-container-lowest">
          <p className="text-body-sm font-semibold text-on-surface">{patientName}</p>
          <p className="text-label-sm text-on-surface-variant">Dossier médical — lecture seule</p>
        </div>
      )}

      <div className="shrink-0 flex gap-0 border-b border-outline-variant bg-surface-container-lowest overflow-x-auto">
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
        {tab === "constantes" && (
          <VitalsTab patientId={patientId} canWrite={false} />
        )}
        {tab === "notes" && (
          <NotesTab patientId={patientId} canWrite={false} canSign={false} />
        )}
        {tab === "diagnostics" && (
          <ConditionsTab patientId={patientId} canWrite={false} />
        )}
        {tab === "ordonnances" && (
          <PrescriptionsPanel patientId={patientId} />
        )}
        {tab === "allergies" && (
          <AllergiesTab patientId={patientId} canWrite={false} onMutation={() => {}} />
        )}
      </div>
    </div>
  );
}
