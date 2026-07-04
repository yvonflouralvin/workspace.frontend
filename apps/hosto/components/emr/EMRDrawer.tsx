"use client";

import { useState } from "react";
import { LeftDrawer } from "@repo/ui/LeftDrawer";
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

export function EMRDrawer({
  patientId,
  patientName,
  onClose,
}: {
  patientId: number;
  patientName: string;
  onClose: () => void;
}) {
  const [tab, setTab] = useState<EMRTab>("constantes");

  return (
    <LeftDrawer
      title={`Dossier — ${patientName}`}
      onClose={onClose}
      width="w-[720px] max-w-full"
      contentClassName="flex flex-col gap-0 p-0"
    >
      {/* Tab bar */}
      <div className="shrink-0 flex gap-1 border-b border-outline-variant px-4 bg-surface-container-lowest">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={[
              "px-3 py-2.5 text-body-sm transition-colors -mb-px border-b-2 whitespace-nowrap",
              tab === t.id
                ? "border-primary text-primary font-medium"
                : "border-transparent text-on-surface-variant hover:text-on-surface",
            ].join(" ")}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
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
    </LeftDrawer>
  );
}
