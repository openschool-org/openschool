import { Toggle, Tag, Button, SkeletonText, InlineNotification } from "@carbon/react";
import { Play } from "@carbon/icons-react";
import { useJobs, useSetJobEnabled, useRunJobNow } from "../../../queries/useJobs";
import { getErrorMessage } from "../../../lib/errorMessage";
import ErrorMessage from "../../../components/common/ErrorMessage";
import type { JobRunStatus } from "../../../services/jobs";

function humanizeJobName(name: string) {
  return name.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

// The backup job can't be disabled — see the matching check in
// internal/handlers/jobs.go's SetEnabled. Disabling it silently stops the
// school's only backup mechanism, with no other symptom until an incident.
const NON_DISABLEABLE_JOBS = new Set(["backup_migration_drift"]);

function statusTag(status: JobRunStatus) {
  switch (status) {
    case "ok":
      return <Tag type="green" size="sm">OK</Tag>;
    case "failed":
      return <Tag type="red" size="sm">Failed</Tag>;
    case "running":
      return <Tag type="blue" size="sm">Running</Tag>;
  }
}

export default function Automation() {
  const { data: jobs, isLoading, isError, refetch } = useJobs();
  const setEnabled = useSetJobEnabled();
  const runNow = useRunJobNow();

  return (
    <div className="os-page">
      <div className="os-page__header">
        <div className="os-page__header-left">
          <h1 className="os-page__title">Automation</h1>
          <p className="os-page__subtitle">
            Scheduled background checks that support the system's operation —
            none of the app's other features depend on them, so any of these
            can be turned off safely, except the backup job.
          </p>
        </div>
      </div>

      {isError && (
        <div style={{ marginBottom: "1.5rem" }}>
          <ErrorMessage message="Could not load background jobs." onRetry={refetch} />
        </div>
      )}

      {(setEnabled.isError || runNow.isError) && (
        <InlineNotification
          kind="error"
          lowContrast
          title="Action failed"
          subtitle={getErrorMessage(setEnabled.error ?? runNow.error, "Please try again.")}
          onClose={() => {
            setEnabled.reset();
            runNow.reset();
          }}
          style={{ marginBottom: "1.5rem", maxWidth: "100%" }}
        />
      )}

      <div className="os-section" style={{ marginTop: 0 }}>
        {isLoading && (
          <div style={{ padding: "1.25rem 1.5rem" }}>
            <SkeletonText width="60%" />
          </div>
        )}

        {!isLoading &&
          (jobs ?? []).map((job, i) => (
            <div
              key={job.name}
              style={{
                display: "flex",
                alignItems: "flex-start",
                justifyContent: "space-between",
                gap: "1.5rem",
                padding: "1rem 1.5rem",
                borderBottom: i < (jobs?.length ?? 0) - 1 ? "1px solid #e0e0e0" : "none",
                flexWrap: "wrap",
              }}
            >
              <div style={{ flex: 1, minWidth: "20rem" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.625rem", flexWrap: "wrap" }}>
                  <span style={{ fontWeight: 600, fontSize: "0.875rem" }}>{humanizeJobName(job.name)}</span>
                  <span className="os-table__mono" style={{ fontSize: "0.75rem" }}>{job.schedule}</span>
                </div>
                <p style={{ margin: "0.25rem 0 0", fontSize: "0.8125rem", color: "#525252" }}>{job.description}</p>

                {job.last_run ? (
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginTop: "0.625rem", flexWrap: "wrap" }}>
                    {statusTag(job.last_run.status)}
                    {job.last_run.findings > 0 && (
                      <Tag type="magenta" size="sm">{job.last_run.findings} finding{job.last_run.findings === 1 ? "" : "s"}</Tag>
                    )}
                    <span style={{ fontSize: "0.75rem", color: "#8d8d8d" }}>
                      Last ran {new Date(job.last_run.started_at).toLocaleString()}
                    </span>
                  </div>
                ) : (
                  <p style={{ margin: "0.625rem 0 0", fontSize: "0.75rem", color: "#8d8d8d" }}>Never run yet</p>
                )}
                {job.last_run?.summary && (
                  <p style={{ margin: "0.375rem 0 0", fontSize: "0.8125rem", color: "#161616" }}>{job.last_run.summary}</p>
                )}
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "1rem", flexShrink: 0 }}>
                <Button
                  kind="ghost"
                  size="sm"
                  renderIcon={Play}
                  disabled={!job.enabled || runNow.isPending}
                  onClick={() => runNow.mutate(job.name)}
                >
                  Run now
                </Button>
                {NON_DISABLEABLE_JOBS.has(job.name) ? (
                  <Tag type="gray" size="sm">Always on</Tag>
                ) : (
                  <Toggle
                    id={`job-toggle-${job.name}`}
                    size="sm"
                    labelText=""
                    hideLabel
                    toggled={job.enabled}
                    disabled={setEnabled.isPending}
                    onToggle={(checked) => setEnabled.mutate({ name: job.name, enabled: checked })}
                  />
                )}
              </div>
            </div>
          ))}
      </div>
    </div>
  );
}
