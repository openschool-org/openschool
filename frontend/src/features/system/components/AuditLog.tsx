import { useState } from "react";
import { Tag } from "antd";
import DataGrid from "@/shared/ui/DataGrid";
import SelectField from "@/shared/ui/SelectField";
import TableSkeleton from "@/shared/ui/TableSkeleton";
import { useAuditLogs, useAuditEntityTypes } from "@/features/system/queries/useAuditLogs";
import { useListFilters } from "@/shared/hooks/useListFilters";
import FilterBar from "@/shared/ui/FilterBar";
import DateField from "@/shared/ui/DateField";
import ErrorMessage from "@/shared/ui/ErrorMessage";
import EmptyState from "@/shared/ui/EmptyState";
import AgentFindingsBanner from "@/features/notifications/components/AgentFindingsBanner";
import { formatDateTime } from "@/shared/lib/date";

function formatEntity(entityType: string) {
  return entityType.replace(/_/g, " ");
}

function formatAction(action: string) {
  return action.replace(/_/g, " ");
}

// Server-paginated (docs/SECURITY_AND_PERFORMANCE_PLAYBOOK.md section 4) -
// an append-only log grows without bound, so this can no longer just show
// "the last 200" and call it done.
export default function AuditLog() {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  // Prefixed keys so this tab's filters do not collide with other Settings tabs in the URL.
  const { filters, set, debouncedSearch } = useListFilters({ auditQuery: "", auditEntity: "", auditFrom: "", auditTo: "" }, { searchKey: "auditQuery" });
  const { data: entityTypes } = useAuditEntityTypes();
  const { data, isLoading, isError, refetch } = useAuditLogs({
    search: debouncedSearch || undefined,
    entity_type: filters.auditEntity || undefined,
    from: filters.auditFrom || undefined,
    to: filters.auditTo || undefined,
    limit: pageSize,
    offset: (page - 1) * pageSize,
  });
  const update = (key: keyof typeof filters, value: string) => {
    set(key, value);
    setPage(1);
  };
  const logs = data?.items;

  const filtered = !!(filters.auditQuery || filters.auditEntity || filters.auditFrom || filters.auditTo);

  return (
    <div className="os-stack os-gap-4">
      <AgentFindingsBanner />
      <div className="os-section">
        <div className="os-section__header">
          <div>
            <h2 className="os-section__title">Audit log</h2>
            <p className="os-text-sm os-c-secondary os-m-0">House re-assignments and attendance edits made after the 24-hour lock, newest first.</p>
          </div>
          {data && <span className="os-section__meta">{data.total} entries</span>}
        </div>
        <div className="os-card-search">
          <FilterBar
            search={{ value: filters.auditQuery, onChange: (v) => update("auditQuery", v), placeholder: "Search by person, action or reason" }}
            controls={[
              {
                label: "Record type",
                node: (
                  <div className="os-w-14">
                    <SelectField id="audit-entity" label="Record type" hideLabel value={filters.auditEntity} onChange={(v) => update("auditEntity", v)} options={[{ value: "", label: "All record types" }, ...(entityTypes ?? []).map((t) => ({ value: t, label: formatEntity(t) }))]} />
                  </div>
                ),
              },
              { label: "From", node: <DateField id="audit-from" labelText="From" hideLabel placeholder="From" value={filters.auditFrom} onChange={(v) => update("auditFrom", v)} maxDate={filters.auditTo || undefined} /> },
              { label: "To", node: <DateField id="audit-to" labelText="To" hideLabel placeholder="To" value={filters.auditTo} onChange={(v) => update("auditTo", v)} minDate={filters.auditFrom || undefined} /> },
            ]}
          />
        </div>

        {isError ? (
          <ErrorMessage message="Could not load the audit log." onRetry={refetch} />
        ) : isLoading ? (
          <TableSkeleton headers={["When", "Record", "Action", "By", "Reason"]} />
        ) : !logs?.length ? (
          filtered ? (
            <EmptyState title="No entries match these filters" description="Try a wider date range or a different search." />
          ) : (
            <EmptyState title="No audit entries yet" description="Manual house changes and attendance edits made after the 24-hour lock will show up here." />
          )
        ) : (
          <DataGrid
            rows={logs}
            getRowId={(e) => e.id}
            noHover
            pageSizes={[25, 50, 100]}
            server={{ page, pageSize, totalItems: data?.total ?? 0, onChange: ({ page: p, pageSize: ps }) => { setPage(ps === pageSize ? p : 1); setPageSize(ps); } }}
            columns={[
              { key: "when", header: "When", render: (e) => <span className="os-nowrap os-table__muted">{formatDateTime(e.created_at)}</span> },
              { key: "entity", header: "Record", render: (e) => <Tag variant="filled">{formatEntity(e.entity_type)}</Tag> },
              { key: "action", header: "Action", render: (e) => <span className="os-fw-500 os-capitalize-first">{formatAction(e.action)}</span> },
              { key: "by", header: "By", render: (e) => e.actor_name ?? "Unknown" },
              { key: "reason", header: "Reason", render: (e) => <span className="os-c-secondary">{e.reason || "-"}</span> },
            ]}
          />
        )}
      </div>
    </div>
  );
}
