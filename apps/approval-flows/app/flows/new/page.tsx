"use client";

import { useRouter } from "next/navigation";
import { DashboardShell } from "@/components/DashboardShell";
import { FlowForm } from "@/components/FlowForm";

export default function NewFlowPage() {
  const router = useRouter();

  return (
    <DashboardShell>
      <div className="p-8 max-w-3xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-on-surface">Créer un flow</h1>
          <p className="text-sm text-on-surface-variant mt-1">
            Définissez le formulaire de soumission et les étapes d&apos;approbation.
          </p>
        </div>

        <div className="rounded-xl border border-outline-variant bg-surface-container-lowest p-6">
          <FlowForm onSaved={() => router.push("/flows")} onCancel={() => router.push("/flows")} />
        </div>
      </div>
    </DashboardShell>
  );
}
