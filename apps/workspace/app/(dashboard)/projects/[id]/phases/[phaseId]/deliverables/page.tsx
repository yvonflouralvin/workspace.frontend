"use client";

import { DeliverablesPanel } from "@/components/projects/DeliverablesPanel";
import { useProject } from "../../../project-context";
import { usePhase } from "../phase-context";

export default function PhaseDeliverablesPage() {
  const { phase, canManage } = usePhase();
  const { tasks } = useProject();
  return <DeliverablesPanel phase={phase} tasks={tasks} canManage={canManage} />;
}
