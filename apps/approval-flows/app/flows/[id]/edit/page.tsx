"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { DashboardShell } from "@/components/DashboardShell";
import { FlowForm } from "@/components/FlowForm";
import { getFlow, ApiError } from "@/app/lib/api";
import type { FlowDetail } from "@repo/approval-flows/types/flow";

export default function EditFlowPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();

  const [flow, setFlow] = useState<FlowDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getFlow(id)
      .then(setFlow)
      .catch((err) => setError(err instanceof ApiError ? err.message : "Une erreur est survenue"))
      .finally(() => setLoading(false));
  }, [id]);

  return (
    <DashboardShell>
      <div className="p-8 max-w-3xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-on-surface">Modifier {flow?.title ?? id}</h1>
          <p className="text-sm text-on-surface-variant mt-1">
            Mettez à jour le formulaire de soumission et les étapes d&apos;approbation.
          </p>
        </div>

        {error && (
          <p className="text-sm text-error bg-error-container/40 rounded-lg px-3 py-2">{error}</p>
        )}

        {loading && <p className="text-sm text-on-surface-variant">Chargement…</p>}

        {!loading && flow && (
          <FlowForm
            flow={flow}
            onSaved={() => router.push("/flows")}
            onCancel={() => router.push("/flows")}
          />
        )}
      </div>
    </DashboardShell>
  );
}
