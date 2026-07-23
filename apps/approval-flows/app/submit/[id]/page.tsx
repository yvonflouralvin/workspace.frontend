"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ApprovalFlowWrapper } from "@repo/approval-flows/ApprovalFlowWrapper";
import type { FlowDetail } from "@repo/approval-flows/types/flow";
import { DashboardShell } from "@/components/DashboardShell";
import { getFlow, ApiError } from "@/app/lib/api";

export default function SubmitFlowPage({ params }: { params: Promise<{ id: string }> }) {
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
      <div className="p-4 md:p-8 max-w-2xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-on-surface">Nouvelle demande</h1>
          <p className="text-sm text-on-surface-variant mt-1">
            Remplissez le formulaire ci-dessous pour soumettre votre demande.
          </p>
        </div>

        {error && (
          <p className="text-sm text-error bg-error-container/40 rounded-lg px-3 py-2">{error}</p>
        )}

        {loading && <p className="text-sm text-on-surface-variant">Chargement…</p>}

        {!loading && flow && flow.app_key !== null && (
          <p className="text-sm text-on-surface-variant bg-surface-container rounded-lg px-3 py-2">
            Ce formulaire appartient à l&apos;application « {flow.app_key} » — il se soumet
            depuis cette application, pas en libre-service ici.
          </p>
        )}

        {!loading && flow && flow.app_key === null && (
          <div className="rounded-xl border border-outline-variant bg-surface-container-lowest p-6">
            <ApprovalFlowWrapper
              flowId={id}
              onSubmitted={(request) => router.push(`/my-requests/${request.id}`)}
            />
          </div>
        )}
      </div>
    </DashboardShell>
  );
}
