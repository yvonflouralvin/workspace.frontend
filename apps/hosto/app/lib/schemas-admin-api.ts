import { apiFetch } from "@repo/network/client";
import { ApiError } from "./api";

export interface SchemaAdministration {
  id: number;
  nom: string;
  code: string | null;
  nombre_prises: number;
  horaires: string[];
  is_default: boolean;
  active: boolean;
}

async function parseJson<T>(response: Response): Promise<T> {
  const data: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const err = data as Record<string, unknown> | null;
    throw new ApiError(
      err != null ? String(err.detail ?? err.message ?? "Une erreur est survenue") : "Une erreur est survenue",
      response.status,
    );
  }
  return data as T;
}

export async function listSchemasAdministration(): Promise<SchemaAdministration[]> {
  return parseJson<SchemaAdministration[]>(await apiFetch("/api/schemas-administration"));
}

export async function createSchemaAdministration(data: {
  nom: string;
  code?: string | null;
  nombre_prises: number;
  horaires: string[];
  is_default?: boolean;
}): Promise<SchemaAdministration> {
  return parseJson<SchemaAdministration>(
    await apiFetch("/api/schemas-administration", { method: "POST", body: data }),
  );
}

export async function updateSchemaAdministration(
  id: number,
  data: Partial<{ nom: string; code: string | null; nombre_prises: number; horaires: string[]; is_default: boolean; active: boolean }>,
): Promise<SchemaAdministration> {
  return parseJson<SchemaAdministration>(
    await apiFetch(`/api/schemas-administration/${id}`, { method: "PATCH", body: data }),
  );
}

export async function deleteSchemaAdministration(id: number): Promise<void> {
  const res = await apiFetch(`/api/schemas-administration/${id}`, { method: "DELETE" });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new ApiError(String((data as Record<string, unknown>)?.detail ?? "Suppression impossible."), res.status);
  }
}
