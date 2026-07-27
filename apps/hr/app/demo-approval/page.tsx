"use client";

import { ApprovalFlowWrapper } from "@repo/approval-flows/ApprovalFlowWrapper";
import { DashboardShell } from "@/components/DashboardShell";

export default function DemoApprovalPage() {
  return (
    <DashboardShell>
      <div className="p-4 md:p-8 max-w-2xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-on-surface">Démo — Demande de congé</h1>
          <p className="text-sm text-on-surface-variant mt-1">
            Intégration mode 1 du service ApprovalFlow : ce formulaire est généré
            depuis le template <code>hr.leave_request</code>, enregistré au
            démarrage du service RH.
          </p>
        </div>

        <div className="rounded-xl border border-outline-variant bg-surface-container-lowest p-5">
          <ApprovalFlowWrapper flowId="hr.leave_request" />
        </div>
      </div>
    </DashboardShell>
  );
}
