import { apiFetch } from "@repo/network/client";

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

async function parseResponse<T>(res: Response): Promise<T> {
  const data = await res.json();
  if (!res.ok) throw new ApiError(data.detail ?? data.message ?? "Erreur", res.status);
  return data as T;
}

// ─── Types ───────────────────────────────────────────────────────────────────

export interface VariableDef {
  key: string;
  type: string;
  label: string;
  required: boolean;
  source: "entity" | "workspace";
  columns?: { key: string; label: string; type?: string }[];
}

export interface PDFTemplate {
  key: string;
  app_key: string;
  name: string;
  description: string | null;
  variables: VariableDef[];
  default_layout: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

export interface WorkspaceLayout {
  template_key: string;
  workspace_id: number;
  layout: Record<string, unknown>;
  is_default?: boolean;
}

export interface WorkspaceSettings {
  template_key: string;
  workspace_id: number;
  data: Record<string, string>;
}

// ─── Templates ────────────────────────────────────────────────────────────────

export function listTemplates(appKey?: string): Promise<PDFTemplate[]> {
  const qs = appKey ? `?app_key=${appKey}` : "";
  return apiFetch(`/api/pdf-templates${qs}`).then((r) => parseResponse<PDFTemplate[]>(r));
}

export function getTemplate(key: string): Promise<PDFTemplate> {
  return apiFetch(`/api/pdf-templates/${key}`).then((r) => parseResponse<PDFTemplate>(r));
}

// ─── Layout ──────────────────────────────────────────────────────────────────

export function getLayout(key: string, workspaceId: number): Promise<WorkspaceLayout> {
  return apiFetch(`/api/pdf-templates/${key}/layout?workspace_id=${workspaceId}`).then((r) =>
    parseResponse<WorkspaceLayout>(r)
  );
}

export function saveLayout(
  key: string,
  workspaceId: number,
  updatedBy: number,
  layout: Record<string, unknown>
): Promise<void> {
  return apiFetch(
    `/api/pdf-templates/${key}/layout?workspace_id=${workspaceId}&updated_by=${updatedBy}`,
    { method: "PUT", body: { layout } }
  ).then((r) => {
    if (!r.ok) return parseResponse<void>(r);
  });
}

// ─── Settings ─────────────────────────────────────────────────────────────────

export function getSettings(key: string, workspaceId: number): Promise<WorkspaceSettings> {
  return apiFetch(`/api/pdf-templates/${key}/settings?workspace_id=${workspaceId}`).then((r) =>
    parseResponse<WorkspaceSettings>(r)
  );
}

export function saveSettings(
  key: string,
  workspaceId: number,
  updatedBy: number,
  data: Record<string, string>
): Promise<void> {
  return apiFetch(
    `/api/pdf-templates/${key}/settings?workspace_id=${workspaceId}&updated_by=${updatedBy}`,
    { method: "PUT", body: { data } }
  ).then((r) => {
    if (!r.ok) return parseResponse<void>(r);
  });
}

// ─── Preview ──────────────────────────────────────────────────────────────────

// apiFetch force response.json() sur toute réponse — incompatible avec un blob PDF binaire.
// On utilise fetch brut ici (NETWORK_ENCRYPTION=clear en dev, pas de chiffrement).
export async function previewTemplate(
  key: string,
  workspaceId: number,
  data: Record<string, unknown>
): Promise<Blob> {
  const res = await fetch(`/api/pdf-templates/${key}/preview`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ workspace_id: workspaceId, data }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Erreur de prévisualisation" }));
    const detail =
      typeof err.detail === "string" ? err.detail : JSON.stringify(err.detail);
    throw new ApiError(detail ?? "Erreur de prévisualisation", res.status);
  }
  return res.blob();
}
