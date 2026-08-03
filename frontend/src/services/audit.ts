import api from "../lib/api";

export interface AuditLogEntry {
  id: string;
  entity_type: string;
  entity_id: string;
  action: string;
  actor_id: string | null;
  actor_name: string | null;
  before: unknown;
  after: unknown;
  reason: string | null;
  created_at: string;
}

export interface AuditLogFilters {
  entity_type?: string;
  entity_id?: string;
}

export const auditApi = {
  list: (params?: AuditLogFilters) =>
    api.get<AuditLogEntry[]>("/audit-logs", { params }).then((r) => r.data),
};
