// packages/approval-flows/types/flow.ts

export interface FieldSchemaItem {
  key: string;
  label: string;
  type: "text" | "number" | "date" | "attachment";
  required: boolean;
}

export interface StepDef {
  step_key: string;
  name: string;
  approver_type: "specific_user" | "specific_group" | "criteria";
  approver_config: Record<string, unknown>;
  approval_mode: "any" | "all";
  order: number;
}

export interface FlowSummary {
  id: string;
  title: string;
  description: string | null;
  app_key: string | null;
  workspace_id: number | null;
  status: string;
  // ids de groupes `auth` autorisés à voir/soumettre ce flow ; [] = tout le workspace
  visible_group_ids: number[];
}

export interface FlowDetail extends FlowSummary {
  fields_schema: FieldSchemaItem[];
  steps: StepDef[];
}

export interface FlowCreate {
  id: string;
  title: string;
  description?: string | null;
  fields_schema: FieldSchemaItem[];
  steps: Omit<StepDef, "order">[];
  visible_group_ids: number[];
}

export type FlowUpdate = Omit<FlowCreate, "id">;

export interface Binding {
  step_key: string;
  approver_type: string;
  approver_config: Record<string, unknown>;
}
