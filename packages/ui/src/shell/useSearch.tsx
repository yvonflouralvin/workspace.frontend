import { apiFetch } from "@repo/network/client";
import type { SearchSection } from "./TopBar";

export function useSearch(searchPath = "/api/search") {
  return async function handleSearch(q: string): Promise<SearchSection[]> {
    try {
      const res = await apiFetch(`${searchPath}?q=${encodeURIComponent(q)}`);
      if (!res.ok) return [];
      return res.json();
    } catch {
      return [];
    }
  };
}
