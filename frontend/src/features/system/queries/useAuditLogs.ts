import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { auditApi } from "@/features/system/api/audit";
import type { AuditLogFilters } from "@/features/system/api/audit";
import { systemKeys } from "@/features/system/keys";

export const useAuditLogs = (filters?: AuditLogFilters) =>
  useQuery({
    queryKey: systemKeys.auditLogs(filters),
    queryFn: () => auditApi.list(filters),
    placeholderData: keepPreviousData,
  });

export const useAuditEntityTypes = () => useQuery({ queryKey: systemKeys.auditEntityTypes(), queryFn: auditApi.entityTypes });
