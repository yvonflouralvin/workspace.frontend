// packages/approval-flows/hooks/useApprovalTasks.ts

import { useCallback, useEffect, useState } from "react";
import { listSubmissions, listTasks } from "../api/client.js";
import type { RequestSummary } from "../types/request.js";

export function useApprovalTasks(mode: "tasks" | "submissions", basePath?: string) {
  const [items, setItems] = useState<RequestSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(() => {
    setLoading(true);
    setError(null);

    const fetcher = mode === "tasks" ? listTasks : listSubmissions;
    return fetcher(basePath)
      .then(setItems)
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Une erreur est survenue");
      })
      .finally(() => setLoading(false));
  }, [mode, basePath]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { items, loading, error, refetch };
}
