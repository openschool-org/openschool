import { useState } from "react";
import { Pagination, SkeletonText, Tag } from "@carbon/react";
import { Select, SelectItem } from "@carbon/react";
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

  return (
    <div>
      <div className="os-page__header">
        <div>
          <h2 className="os-section__title os-m-0">
            Audit log
          </h2>
          <p className="os-page__subtitle os-mt-1">
            Manual house re-assignments and admin edits made to attendance
            after its 24-hour lock - most recent first.
          </p>
        </div>
      </div>

      <AgentFindingsBanner />

      <FilterBar
        search={{ value: filters.auditQuery, onChange: (v) => update("auditQuery", v), placeholder: "Search by person, action or reason" }}
        controls={[
          {
            label: "Record type",
            node: (
              <Select id="audit-entity" labelText="Record type" hideLabel size="md" value={filters.auditEntity} onChange={(e) => update("auditEntity", e.target.value)}>
                <SelectItem value="" text="All record types" />
                {entityTypes?.map((t) => <SelectItem key={t} value={t} text={formatEntity(t)} />)}
              </Select>
            ),
          },
          { label: "From", node: <DateField id="audit-from" labelText="From" hideLabel placeholder="From" value={filters.auditFrom} onChange={(v) => update("auditFrom", v)} maxDate={filters.auditTo || undefined} /> },
          { label: "To", node: <DateField id="audit-to" labelText="To" hideLabel placeholder="To" value={filters.auditTo} onChange={(v) => update("auditTo", v)} minDate={filters.auditFrom || undefined} /> },
        ]}
      />

      {isError && <ErrorMessage message="Could not load the audit log." onRetry={refetch} />}

      <div className="os-section">
        {isLoading && (
          <div>
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i} className="os-flex os-gap-4 os-py-3h os-px-6 os-border-b"
              >
                <SkeletonText width="10rem" />
                <SkeletonText width="20%" />
              </div>
            ))}
          </div>
        )}

        {!isLoading && !isError && (logs?.length ?? 0) === 0 && (
          filters.auditQuery || filters.auditEntity || filters.auditFrom || filters.auditTo ? (
            <EmptyState title="No entries match these filters" description="Try a wider date range or a different search." />
          ) : (
            <EmptyState
              title="No audit entries yet"
              description="Manual house changes and attendance edits made after the 24-hour lock will show up here."
            />
          )
        )}

        {!isLoading && logs && logs.length > 0 && (
          <div>
            {logs.map((entry, i) => (
              <div
                key={entry.id} className={`os-py-3h os-px-6 ${i < logs.length - 1 ? "os-border-b" : ""}`}
              >
                <div className="os-flex os-items-center os-gap-3 os-wrap">
                  <Tag type="cool-gray" size="sm">
                    {formatEntity(entry.entity_type)}
                  </Tag>
                  <span className="os-fw-600 os-text-md">
                    {formatAction(entry.action)}
                  </span>
                  <div className="os-flex-1" />
                  <span className="os-text-xs os-c-tertiary">
                    {formatDateTime(entry.created_at)}
                  </span>
                </div>
                <p className="os-mt-1h os-mx-0 os-mb-0 os-text-sm os-c-secondary">
                  By {entry.actor_name ?? "unknown"}
                  {entry.reason ? ` - "${entry.reason}"` : ""}
                </p>
              </div>
            ))}
          </div>
        )}

        {!isLoading && logs && logs.length > 0 && (
          <Pagination
            totalItems={data?.total ?? 0}
            page={page}
            pageSize={pageSize}
            pageSizes={[25, 50, 100]}
            onChange={({ page: p, pageSize: ps }) => { setPage(p); setPageSize(ps); }}
            size="sm"
          />
        )}
      </div>
    </div>
  );
}
