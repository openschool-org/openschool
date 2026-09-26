import api from "@/shared/api/client";

// Mirrors internal/modules/workflows. The frontend renders any workflow from these shapes alone.
export interface Option {
  value: string;
  label: string;
}

export type InputType = "select" | "multiselect" | "text" | "date" | "boolean";

export interface InputField {
  key: string;
  label: string;
  type: InputType;
  required: boolean;
  default?: string;
  help?: string;
  options?: Option[];
}

export interface Check {
  key: string;
  title: string;
  ok: boolean;
  detail?: string;
  fix_path?: string;
  blocking: boolean;
}

export interface ToolInfo {
  name: string;
  description: string;
  mutates: boolean;
}

export interface StepInfo {
  key: string;
  title: string;
  tool: string;
  phase: "propose" | "apply";
}

export interface RunSummary {
  id: string;
  state: RunState;
  summary?: string;
  error?: string;
  created_at: string;
  applied_at?: string;
  created_by_name?: string;
  applied_by_name?: string;
}

export type RunState = "proposed" | "applied" | "failed" | "reverted" | "discarded";

export interface CatalogEntry {
  key: string;
  order: number;
  title: string;
  description: string;
  steps: StepInfo[];
  tools: ToolInfo[];
  inputs: InputField[];
  last_run?: RunSummary;
}

export interface Column {
  key: string;
  label: string;
  type: "text" | "number" | "select" | "boolean";
  editable: boolean;
  options?: Option[];
}

export interface Row {
  id: string;
  cells: Record<string, string>;
  options?: Record<string, Option[]>;
  reason?: string;
  warning?: string;
  group?: string;
}

export interface Section {
  key: string;
  title: string;
  description?: string;
  columns: Column[];
  rows: Row[];
}

export interface Proposal {
  summary: { label: string; value: string }[];
  warnings: string[] | null;
  sections: Section[];
}

export interface TraceStep {
  key: string;
  title: string;
  tool: string;
  ok: boolean;
  detail?: string;
  duration_ms: number;
}

export interface Run {
  id: string;
  workflow_key: string;
  state: RunState;
  inputs: Record<string, string>;
  proposal: Proposal;
  trace: TraceStep[];
  summary?: string;
  error?: string;
  created_at: string;
  applied_at?: string;
}

export type Inputs = Record<string, string>;

export const workflowApi = {
  catalog: () => api.get<CatalogEntry[]>("/workflows").then((r) => r.data),
  check: (key: string, inputs: Inputs) => api.post<{ checks: Check[] }>(`/workflows/${key}/check`, { inputs }).then((r) => r.data.checks),
  propose: (key: string, inputs: Inputs) => api.post<{ run: Run; checks: Check[] }>(`/workflows/${key}/runs`, { inputs }).then((r) => r.data),
  history: (key: string) => api.get<RunSummary[]>(`/workflows/${key}/runs`).then((r) => r.data),
  run: (id: string) => api.get<Run>(`/workflow-runs/${id}`).then((r) => r.data),
  edit: (id: string, section: string, rowId: string, cells: Record<string, string>) =>
    api.patch<Run>(`/workflow-runs/${id}/rows`, { section, row_id: rowId, cells }).then((r) => r.data),
  apply: (id: string) => api.post<Run>(`/workflow-runs/${id}/apply`).then((r) => r.data),
  discard: (id: string) => api.post(`/workflow-runs/${id}/discard`).then((r) => r.data),
  revert: (id: string) => api.post(`/workflow-runs/${id}/revert`).then((r) => r.data),
};
