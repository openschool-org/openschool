import { Toggle, Tag, Button, SkeletonText } from "@carbon/react";
import { Play } from "@carbon/icons-react";
import { useJobs, useSetJobEnabled, useRunJobNow } from "@/features/system/queries/useJobs";
import ErrorMessage from "@/shared/ui/ErrorMessage";
import MutationErrorNotification from "@/shared/ui/MutationErrorNotification";
import type { JobRunStatus } from "@/features/system/api/jobs";
import { formatDateTime } from "@/shared/lib/date";
import InfoTip from "@/shared/ui/InfoTip";

function humanizeJobName(name: string) {
  return name.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

// Agent schedules are fixed cron expressions set in code; this just reads friendlier than raw cron next to each name.
const SCHEDULE_LABELS: Record<string, string> = {
  "0 * * * *": "Hourly",
  "0 2 * * *": "Daily at 2:00 AM",
  "0 3 * * *": "Daily at 3:00 AM",
  "0 5 * * *": "Daily at 5:00 AM",
  "0 12 * * 1-5": "Weekdays at 12:00 PM",
};

function humanizeSchedule(cron: string) {
  return SCHEDULE_LABELS[cron] ?? cron;
}

// Can't be disabled, it's the school's only backup mechanism (see internal/handlers/jobs.go's SetEnabled).
const NON_DISABLEABLE_JOBS = new Set(["system_health_agent"]);

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

export default function Automation({ inline = false }: { inline?: boolean }) {
  const { data: jobs, isLoading, isError, refetch } = useJobs();
  const setEnabled = useSetJobEnabled();
  const runNow = useRunJobNow();

  return (
    <div className={inline ? "" : "os-page"}>
      {!inline && (
        <div className="os-page__header">
          <div className="os-page__header-left">
            <h1 className="os-page__title">Automation</h1>
            <div className="os-page__subtitle os-page__subtitle--tip">
              Background jobs. Each one can be turned off safely.
              <InfoTip>Other features do not depend on these jobs. Keep System Health on, since it runs the backup.</InfoTip>
            </div>
          </div>
        </div>
      )}

      {isError && (
        <div className="os-mb-6">
          <ErrorMessage message="Could not load background agents." onRetry={refetch} />
        </div>
      )}

      <MutationErrorNotification
        isError={setEnabled.isError || runNow.isError}
        error={setEnabled.error ?? runNow.error}
        title="Action failed"
        fallback="Please try again."
        onClose={() => {
          setEnabled.reset();
          runNow.reset();
        }} className="os-mb-6"
      />

      <div className="os-section os-mt-0">
        {isLoading && (
          <div className="os-py-5 os-px-6">
            <SkeletonText width="60%" />
          </div>
        )}

        {!isLoading &&
          (jobs ?? []).map((job, i) => (
            <div
              key={job.name} className={`os-flex os-items-start os-justify-between os-gap-6 os-py-4 os-px-6 os-wrap ${i < (jobs?.length ?? 0) - 1 ? "os-border-b" : ""}`}
            >
              <div className="os-flex-1 os-min-w-20">
                <div className="os-flex os-items-center os-gap-2h os-wrap">
                  <span className="os-fw-600 os-text-md">{humanizeJobName(job.name)}</span>
                  <Tag type="blue" size="sm">{humanizeSchedule(job.schedule)}</Tag>
                </div>
                <p className="os-mt-1 os-mx-0 os-mb-0 os-text-sm os-c-secondary">{job.description}</p>

                {job.last_run ? (
                  <div className="os-flex os-items-center os-gap-2 os-mt-2h os-wrap">
                    {statusTag(job.last_run.status)}
                    {job.last_run.findings > 0 && (
                      <Tag type="magenta" size="sm">{job.last_run.findings} finding{job.last_run.findings === 1 ? "" : "s"}</Tag>
                    )}
                    <span className="os-text-xs os-c-tertiary">
                      Last ran {formatDateTime(job.last_run.started_at)}
                    </span>
                  </div>
                ) : (
                  <p className="os-mt-2h os-mx-0 os-mb-0 os-text-xs os-c-tertiary">Never run yet</p>
                )}
                {job.last_run?.summary && (
                  <p className="os-mt-1h os-mx-0 os-mb-0 os-text-sm os-c-primary">{job.last_run.summary}</p>
                )}
              </div>

              <div className="os-flex os-items-center os-gap-4 os-shrink-0">
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
                    labelText={`Enable ${humanizeJobName(job.name)}`}
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
