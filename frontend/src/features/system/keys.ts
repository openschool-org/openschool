import type { AuditLogFilters } from "@/features/system/api/audit";

export const systemKeys = {
  all: ["system"] as const,
  auditLogs: (filters?: AuditLogFilters) => ["system", "audit-logs", filters ?? {}] as const,
  auditEntityTypes: () => ["system", "audit-logs", "entity-types"] as const,
  globalSearch: (q: string) => ["system", "search", q] as const,
  orphanedAccounts: () => ["system", "orphaned-accounts"] as const,
  jobs: () => ["system", "jobs"] as const,
  findings: (page: string) => ["system", "jobs", "findings", page] as const,
};
