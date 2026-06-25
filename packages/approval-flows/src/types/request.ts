// packages/approval-flows/types/request.ts

import type { FieldType } from "./flow.js";

export interface DecisionOut {
  step_order: number;
  decided_by: number;
  // résolu côté service depuis `auth` — null si la résolution n'a pas été
  // demandée (liste) ou a échoué ; retomber sur `decided_by` (id) dans ce cas
  decided_by_name: string | null;
  decision: "approve" | "reject";
  comment: string | null;
  decided_at: string;
}

export interface RequestSummary {
  id: string;
  flow_id: string;
  flow_title: string;
  version_number: number;
  workspace_id: number;
  submitted_by: number;
  status: "pending" | "approved" | "rejected" | "needs_update" | "cancelled";
  current_step_order: number;
  created_at: string;
}

export interface RequestStepInfo {
  step_key: string;
  name: string;
  order: number;
}

export interface RequestFieldInfo {
  key: string;
  label: string;
  type: FieldType;
}

export interface AttachmentOut {
  document_id: number;
  filename: string;
  content_type: string;
  size_bytes: number;
}

export interface RequestDetail extends RequestSummary {
  field_values: Record<string, unknown>;
  external_ref: Record<string, unknown> | null;
  decisions: DecisionOut[];
  steps: RequestStepInfo[];
  fields: RequestFieldInfo[];
}

export interface RequestListResponse {
  requests: RequestSummary[];
  total: number;
}

export interface RequestCreate {
  flow_id: string;
  field_values: Record<string, unknown>;
  external_ref?: Record<string, unknown> | null;
  callback_url?: string | null;
}

export interface DecisionIn {
  decision: "approve" | "reject";
  comment?: string | null;
}
