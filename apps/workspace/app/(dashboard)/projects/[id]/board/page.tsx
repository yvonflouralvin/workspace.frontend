"use client";

import { Suspense } from "react";
import { TasksView } from "@/components/projects/TasksView";

export default function ProjectBoardPage() {
  return (
    <Suspense fallback={<div className="text-sm text-on-surface-variant">Chargement…</div>}>
      <TasksView mode="kanban" />
    </Suspense>
  );
}
