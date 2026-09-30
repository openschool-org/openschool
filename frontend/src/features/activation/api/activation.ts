import api from "@/shared/api/client";

export type ActivationRole = "student" | "parent";

export interface ActivationStatus {
  student: boolean;
  parent: boolean;
}

export interface ActivationSettings {
  student_enabled: boolean;
  parent_enabled: boolean;
  // ISO timestamps; null means no limit on that side
  opens_at: string | null;
  closes_at: string | null;
  code_ttl_days: number;
}

export interface StartActivationRequest {
  role: ActivationRole;
  code: string;
  identifier: string;
  email: string;
}

export interface CompleteActivationRequest {
  token: string;
  new_password: string;
}

export interface GenerateCodesRequest {
  role: ActivationRole;
  class_id?: string;
  record_id?: string;
}

export interface IssuedCode {
  name: string;
  // children's names for a parent code, empty for a student
  detail: string;
  code: string;
  // students only; shown on the class teacher's hand-out list, never on a slip
  index_number?: string;
  class_name: string;
  grade_name: string;
  grade_order: number;
  form_teacher: string;
}

// The plain codes exist only in this response; the server keeps hashes.
export interface GeneratedBatch {
  batch_id: string;
  role: ActivationRole;
  expires_at: string;
  codes: IssuedCode[];
}

export interface ActivationBatch {
  batch_id: string;
  role: ActivationRole;
  created_at: string;
  expires_at: string;
  total: number;
  used: number;
  revoked: number;
  expired: number;
  // unused codes that can be opened again as PDF or CSV
  reprintable: number;
}

export const activationApi = {
  status: () => api.get<ActivationStatus>("/activation/status").then((r) => r.data),
  start: (data: StartActivationRequest) => api.post<{ message: string }>("/activation/start", data).then((r) => r.data),
  complete: (data: CompleteActivationRequest) => api.post("/activation/complete", data).then((r) => r.data),

  getSettings: () => api.get<ActivationSettings>("/activation/settings").then((r) => r.data),
  updateSettings: (data: ActivationSettings) => api.put<ActivationSettings>("/activation/settings", data).then((r) => r.data),
  generate: (data: GenerateCodesRequest) => api.post<GeneratedBatch>("/activation/codes", data).then((r) => r.data),
  batches: () => api.get<ActivationBatch[]>("/activation/batches").then((r) => r.data),
  // Reopens a batch's unused codes; each call is audited on the server.
  batchCodes: (batchId: string) => api.get<GeneratedBatch>(`/activation/batches/${batchId}/codes`).then((r) => r.data),
  revokeBatch: (batchId: string) => api.post<{ revoked: number }>(`/activation/batches/${batchId}/revoke`).then((r) => r.data),
};
