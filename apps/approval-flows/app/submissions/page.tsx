"use client";

import { ApprovalTaskList } from "@repo/approval-flows/ApprovalTaskList";
import { DashboardShell } from "@/components/DashboardShell";

export default function SubmissionsPage() {
  return (
    <DashboardShell>
      <div className="p-8 max-w-3xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-on-surface">Mes soumissions</h1>
          <p className="text-sm text-on-surface-variant mt-1">
            Demandes que vous avez soumises et leur statut.
          </p>
        </div>

        <ApprovalTaskList mode="submissions" />
      </div>
    </DashboardShell>
  );
}
