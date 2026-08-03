import { useQuery } from "@tanstack/react-query";
import { auditApi } from "../services/audit";
import type { AuditLogFilters } from "../services/audit";

export const auditLogsKey = (filters?: AuditLogFilters) => ["audit-logs", filters ?? {}];

export const useAuditLogs = (filters?: AuditLogFilters) =>
  useQuery({
    queryKey: auditLogsKey(filters),
    queryFn: () => auditApi.list(filters),
  });
