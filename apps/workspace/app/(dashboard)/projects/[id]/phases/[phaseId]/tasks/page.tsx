"use client";

import { Suspense } from "react";
import { TasksView } from "@/components/projects/TasksView";
import { usePhase } from "../phase-context";

export default function PhaseTasksPage() {
  const { phase } = usePhase();
  return (
    <Suspense fallback={<div className="text-body-sm text-on-surface-variant">Chargement…</div>}>
      <TasksView mode="liste" phaseId={phase.id} modeSwitch />
    </Suspense>
  );
}
