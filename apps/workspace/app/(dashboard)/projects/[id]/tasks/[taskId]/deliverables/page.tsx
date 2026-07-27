"use client";

import { DeliverablesPanel } from "@/components/projects/DeliverablesPanel";
import { useProject } from "../../../project-context";
import { useTask } from "../task-context";

export default function TaskDeliverablesPage() {
  const { task, phase, canManage } = useTask();
  const { tasks } = useProject();
  if (!phase) return <p className="text-body-sm text-on-surface-variant">Phase introuvable.</p>;
  return <DeliverablesPanel phase={phase} tasks={tasks} canManage={canManage} taskId={task.id} />;
}
