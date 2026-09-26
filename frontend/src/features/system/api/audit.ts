import api from "@/shared/api/client";
import type { Page } from "@/shared/api/page";

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

// /audit-logs is server-paginated (docs/SECURITY_AND_PERFORMANCE_PLAYBOOK.md
// section 4) - an append-only log grows without bound.
export interface AuditLogFilters {
  entity_type?: string;
  entity_id?: string;
  search?: string;
  from?: string;
  to?: string;
  limit?: number;
  offset?: number;
}

export const auditApi = {
  list: (params?: AuditLogFilters) =>
    api.get<Page<AuditLogEntry>>("/audit-logs", { params }).then((r) => r.data),

  // Entity types that have entries, so the filter never lists types by hand.
  entityTypes: () => api.get<string[]>("/audit-logs/entity-types").then((r) => r.data),
};
