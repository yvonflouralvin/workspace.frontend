"use client";

import { ApprovalTaskList } from "@repo/approval-flows/ApprovalTaskList";
import { DashboardShell } from "@/components/DashboardShell";
import { ConsoleTabs } from "@/components/ConsoleTabs";

export default function RequestsPage() {
  return (
    <DashboardShell>
      <div className="p-4 md:p-8 max-w-[1024px] mx-auto space-y-5">
        <ConsoleTabs />
        <div>
          <h1 className="text-2xl font-bold text-on-surface">Requests</h1>
          <p className="text-sm text-on-surface-variant mt-1">
            Demandes où vous intervenez comme approbateur, en attente de votre décision.
          </p>
        </div>

        <ApprovalTaskList mode="tasks" />
      </div>
    </DashboardShell>
  );
}
