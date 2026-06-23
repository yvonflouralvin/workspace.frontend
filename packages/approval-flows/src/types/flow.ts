// packages/approval-flows/types/flow.ts

export type FieldType =
  | "text_short"
  | "text_long"
  | "number"
  | "date"
  | "attachment"
  | "single_choice"
  | "multi_choice";

export interface FieldSchemaItem {
  key: string;
  label: string;
  description?: string | null;
  type: FieldType;
  required: boolean;
  // single_choice | multi_choice uniquement
  options?: string[] | null;
}

export interface StepDef {
  step_key: string;
  name: string;
  approver_type: "specific_user" | "specific_group" | "criteria";
  approver_config: Record<string, unknown>;
  approval_mode: "any" | "all";
  order: number;
}

export interface VersionContent {
  title: string;
  description?: string | null;
  fields_schema: FieldSchemaItem[];
  steps: Omit<StepDef, "order">[];
}

export interface VersionSummary {
  id: number;
  version_number: number;
  status: "draft" | "published" | "archived";
  title: string;
  created_at: string;
  has_submissions: boolean;
}

export interface VersionDetail extends VersionSummary {
  description: string | null;
  fields_schema: FieldSchemaItem[];
  steps: StepDef[];
}

export interface FlowSummary {
  id: string;
  title: string;
  app_key: string | null;
  // null = template d'app jamais configuré dans ce workspace (catalogue uniquement)
  workspace_id: number | null;
  // true si une version published existe
  configured: boolean;
  has_draft: boolean;
  // ids de groupes `auth` autorisés à voir/soumettre ce flow ; [] = tout le workspace
  visible_group_ids: number[];
}

export interface FlowDetail extends FlowSummary {
  published_version: VersionDetail | null;
  draft_version: VersionDetail | null;
  // contenu suggéré du template d'app — seulement si `configured` est false
  suggested_title?: string | null;
  suggested_description?: string | null;
  suggested_fields_schema?: FieldSchemaItem[] | null;
  suggested_steps?: Omit<StepDef, "order">[] | null;
}

export interface FlowCreate extends VersionContent {
  id: string;
  visible_group_ids: number[];
}

export interface FlowPatch {
  visible_group_ids: number[];
}
