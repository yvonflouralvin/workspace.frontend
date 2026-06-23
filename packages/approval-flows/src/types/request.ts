// packages/approval-flows/types/request.ts

export interface DecisionOut {
  step_order: number;
  decided_by: number;
  decision: "approve" | "reject";
  comment: string | null;
  decided_at: string;
}

export interface RequestSummary {
  id: string;
  flow_id: string;
  version_number: number;
  workspace_id: number;
  submitted_by: number;
  status: "pending" | "approved" | "rejected" | "cancelled";
  current_step_order: number;
  created_at: string;
}

export interface RequestDetail extends RequestSummary {
  field_values: Record<string, unknown>;
  external_ref: Record<string, unknown> | null;
  decisions: DecisionOut[];
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
