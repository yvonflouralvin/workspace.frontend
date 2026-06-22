"use client";

import { useEffect, useRef, useState } from "react";

interface UseSearchOptionsParams<T> {
  fetchOptions: (query: string) => Promise<T[]>;
  debounceMs?: number;
  enabled?: boolean;
}

interface UseSearchOptionsResult<T> {
  items: T[];
  loading: boolean;
  error: string | null;
  query: string;
  setQuery: (query: string) => void;
}

export function useSearchOptions<T>({
  fetchOptions,
  debounceMs = 300,
  enabled = true,
}: UseSearchOptionsParams<T>): UseSearchOptionsResult<T> {
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [items, setItems] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const requestId = useRef(0);

  useEffect(() => {
    const timeout = setTimeout(() => setDebouncedQuery(query), debounceMs);
    return () => clearTimeout(timeout);
  }, [query, debounceMs]);

  useEffect(() => {
    if (!enabled) {
      setLoading(false);
      return;
    }

    const currentRequest = ++requestId.current;
    setLoading(true);
    setError(null);

    fetchOptions(debouncedQuery)
      .then((results) => {
        if (currentRequest !== requestId.current) return;
        setItems(results);
      })
      .catch(() => {
        if (currentRequest !== requestId.current) return;
        setError("Une erreur est survenue");
        setItems([]);
      })
      .finally(() => {
        if (currentRequest === requestId.current) setLoading(false);
      });
  }, [fetchOptions, debouncedQuery, enabled]);

  return { items, loading, error, query, setQuery };
}
