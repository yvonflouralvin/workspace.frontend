"use client";

import { useRouter } from "next/navigation";
import { DashboardShell } from "@/components/DashboardShell";
import { GardePermission } from "@/components/GardePermission";
import { FlowForm } from "@/components/FlowForm";
import type { FlowDetail } from "@repo/approval-flows/types/flow";

export default function NewFlowPage() {
  const router = useRouter();

  return (
    <DashboardShell>
      <GardePermission permission="approval_flows.manage" quoi="Conception des flux">
      <div className="p-4 md:p-8 max-w-3xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-on-surface">Créer un flow</h1>
          <p className="text-sm text-on-surface-variant mt-1">
            Définissez le formulaire de soumission et les étapes d&apos;approbation. Le flow est
            créé en brouillon — publiez-le depuis la page suivante pour le rendre disponible aux
            membres du workspace.
          </p>
        </div>

        <div className="rounded-xl border border-outline-variant bg-surface-container-lowest p-6">
          <FlowForm
            onSaved={(saved: FlowDetail) => router.replace(`/flows/${saved.id}/edit`)}
            onCancel={() => router.push("/flows")}
          />
        </div>
      </div>
    </GardePermission>
    </DashboardShell>
  );
}
