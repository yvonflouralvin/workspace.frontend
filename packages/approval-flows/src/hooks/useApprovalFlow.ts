// packages/approval-flows/hooks/useApprovalFlow.ts

import { useEffect, useState } from "react";
import { getFlow } from "../api/client.js";
import type { FlowDetail } from "../types/flow.js";

export function useApprovalFlow(flowId: string, basePath?: string) {
  const [flow, setFlow] = useState<FlowDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    getFlow(flowId, basePath)
      .then((result) => {
        if (!cancelled) setFlow(result);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Une erreur est survenue");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [flowId, basePath]);

  return { flow, loading, error };
}
