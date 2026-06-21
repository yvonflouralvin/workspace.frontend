"use client";

import { useEffect, useRef, useState } from "react";
import { apiFetch } from "@repo/network/client";

interface UseGraphQLRecordsOptions {
  app: string;
  model: string;
  searchFields?: string[];
  pageSize?: number;
  debounceMs?: number;
  // Désactive le fetch (ex: en attendant la résolution des permissions côté appelant).
  enabled?: boolean;
  // Relations à embarquer (voir backends/docs/services/graphql/GRAPHQL.md#relations).
  include?: string[];
  depth?: number;
}

interface UseGraphQLRecordsResult<T> {
  items: T[];
  total: number;
  loading: boolean;
  error: string | null;
  query: string;
  setQuery: (query: string) => void;
  page: number;
  setPage: (page: number) => void;
  pageCount: number;
  refetch: () => void;
}

const RECORDS_QUERY = `
  query Records(
    $app: String!
    $model: String!
    $filter: JSON
    $limit: Int!
    $offset: Int!
    $include: [String!]
    $depth: Int
  ) {
    records(
      app: $app
      model: $model
      filter: $filter
      limit: $limit
      offset: $offset
      include: $include
      depth: $depth
    ) {
      items
      total
    }
  }
`;

export function useGraphQLRecords<T = Record<string, unknown>>({
  app,
  model,
  searchFields,
  pageSize = 10,
  debounceMs = 300,
  enabled = true,
  include,
  depth,
}: UseGraphQLRecordsOptions): UseGraphQLRecordsResult<T> {
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [page, setPageState] = useState(0);
  const [items, setItems] = useState<T[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refetchToken, setRefetchToken] = useState(0);
  const requestId = useRef(0);

  useEffect(() => {
    const timeout = setTimeout(() => setDebouncedQuery(query), debounceMs);
    return () => clearTimeout(timeout);
  }, [query, debounceMs]);

  function setQueryAndResetPage(next: string) {
    setQuery(next);
    setPageState(0);
  }

  function setPage(next: number) {
    setPageState(next);
  }

  function refetch() {
    setRefetchToken((token) => token + 1);
  }

  // Stabilise la dépendance d'effet : un tableau littéral passé inline par
  // l'appelant change de référence à chaque rendu sans changer de contenu.
  const searchFieldsKey = JSON.stringify(searchFields ?? []);
  const includeKey = JSON.stringify(include ?? []);

  useEffect(() => {
    if (!enabled) {
      setLoading(false);
      return;
    }

    const currentRequest = ++requestId.current;
    setLoading(true);
    setError(null);

    apiFetch("/api/graphql", {
      method: "POST",
      body: {
        query: RECORDS_QUERY,
        variables: {
          app,
          model,
          filter: debouncedQuery ? { search: debouncedQuery, fields: searchFields } : null,
          limit: pageSize,
          offset: page * pageSize,
          include: include ?? null,
          depth: depth ?? 1,
        },
      },
    })
      .then((response) => response.json())
      .then((payload) => {
        if (currentRequest !== requestId.current) return;

        if (payload.errors?.length) {
          setError(payload.errors[0].message ?? "Une erreur est survenue");
          setItems([]);
          setTotal(0);
          return;
        }

        setItems(payload.data?.records?.items ?? []);
        setTotal(payload.data?.records?.total ?? 0);
      })
      .catch(() => {
        if (currentRequest !== requestId.current) return;
        setError("Une erreur est survenue");
        setItems([]);
        setTotal(0);
      })
      .finally(() => {
        if (currentRequest === requestId.current) setLoading(false);
      });
  }, [
    app,
    model,
    debouncedQuery,
    page,
    pageSize,
    searchFieldsKey,
    includeKey,
    depth,
    refetchToken,
    enabled,
  ]);

  const pageCount = Math.max(1, Math.ceil(total / pageSize));

  return {
    items,
    total,
    loading,
    error,
    query,
    setQuery: setQueryAndResetPage,
    page,
    setPage,
    pageCount,
    refetch,
  };
}
