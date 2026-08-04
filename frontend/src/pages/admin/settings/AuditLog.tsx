import { SkeletonText, Tag } from "@carbon/react";
import { useAuditLogs } from "../../../queries/useAuditLogs";
import ErrorMessage from "../../../components/common/ErrorMessage";
import EmptyState from "../../../components/common/EmptyState";

function formatEntity(entityType: string) {
  return entityType.replace(/_/g, " ");
}

function formatAction(action: string) {
  return action.replace(/_/g, " ");
}

export default function AuditLog() {
  const { data: logs, isLoading, isError, refetch } = useAuditLogs();

  return (
    <div>
      <div className="os-page__header">
        <div>
          <h2 className="os-section__title" style={{ margin: 0 }}>
            Audit Log
          </h2>
          <p className="os-page__subtitle" style={{ marginTop: "0.25rem" }}>
            Manual house re-assignments and admin edits made to attendance
            after its 24-hour lock — most recent first.
          </p>
        </div>
      </div>

      {isError && <ErrorMessage message="Could not load the audit log." onRetry={refetch} />}

      <div className="os-section">
        {isLoading && (
          <div>
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                style={{ display: "flex", gap: "1rem", padding: "0.875rem 1.5rem", borderBottom: "1px solid #e0e0e0" }}
              >
                <SkeletonText width="10rem" />
                <SkeletonText width="20%" />
              </div>
            ))}
          </div>
        )}

        {!isLoading && !isError && (logs?.length ?? 0) === 0 && (
          <EmptyState
            title="No audit entries yet"
            description="Manual house changes and attendance edits made after the 24-hour lock will show up here."
          />
        )}

        {!isLoading && logs && logs.length > 0 && (
          <div>
            {logs.map((entry, i) => (
              <div
                key={entry.id}
                style={{
                  padding: "0.875rem 1.5rem",
                  borderBottom: i < logs.length - 1 ? "1px solid #e0e0e0" : "none",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap" }}>
                  <Tag type="cool-gray" size="sm">
                    {formatEntity(entry.entity_type)}
                  </Tag>
                  <span style={{ fontWeight: 600, fontSize: "0.875rem" }}>
                    {formatAction(entry.action)}
                  </span>
                  <div style={{ flex: 1 }} />
                  <span style={{ fontSize: "0.75rem", color: "#8d8d8d" }}>
                    {new Date(entry.created_at).toLocaleString()}
                  </span>
                </div>
                <p style={{ margin: "0.375rem 0 0", fontSize: "0.8125rem", color: "#525252" }}>
                  By {entry.actor_name ?? "unknown"}
                  {entry.reason ? ` — "${entry.reason}"` : ""}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
