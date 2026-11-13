import { Button, Skeleton, Switch, Tag, Tooltip } from "antd";
import { CaretRightOutlined } from "@ant-design/icons";
import { useJobs, useSetJobEnabled, useRunJobNow } from "@/features/system/queries/useJobs";
import ErrorMessage from "@/shared/ui/ErrorMessage";
import MutationErrorNotification from "@/shared/ui/MutationErrorNotification";
import type { JobRunStatus } from "@/features/system/api/jobs";
import { formatDateTime } from "@/shared/lib/date";
import InfoTip from "@/shared/ui/InfoTip";
import WorkflowAgents from "@/features/workflows/components/WorkflowAgents";

function statusTag(status: JobRunStatus) {
  switch (status) {
    case "ok":
      return <Tag color="success" variant="filled">OK</Tag>;
    case "failed":
      return <Tag color="error" variant="filled">Failed</Tag>;
    case "running":
      return <Tag color="processing" variant="filled">Running</Tag>;
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
              Scheduled agents that run by themselves, plus the year-end workflows and setup tools that run when you ask. Each one lists what it does.
              <InfoTip>Other features do not depend on these checks. Agents marked Always on, such as the backup, cannot be turned off.</InfoTip>
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
        }} className="os-mb-4"
      />

      <div className="os-section os-mb-6">
        <div className="os-section__header">
          <div>
            <h2 className="os-section__title">Scheduled agents</h2>
            <p className="os-text-sm os-c-secondary os-m-0">They run on their own. Turn each one on or off, or run it now.</p>
          </div>
        </div>
        {isLoading && <div className="os-p-6"><Skeleton active title={false} paragraph={{ rows: 3 }} /></div>}

        {!isLoading && (jobs ?? []).map((job) => (
          <div key={job.name} className="os-agent-row">
            <div className="os-min-w-0">
              <div className="os-flex os-items-center os-gap-2 os-wrap">
                <span className="os-fw-500 os-text-md">{job.title}</span>
                <Tag variant="filled">{job.schedule_label}</Tag>
              </div>
              <p className="os-mt-1 os-mb-0 os-text-sm os-c-secondary">{job.description}</p>
              <div className="os-flex os-items-center os-gap-2 os-mt-2 os-wrap">
                {job.last_run ? (
                  <>
                    {statusTag(job.last_run.status)}
                    {job.last_run.findings > 0 && <Tag color="magenta" variant="filled">{job.last_run.findings} finding{job.last_run.findings === 1 ? "" : "s"}</Tag>}
                    <span className="os-text-xs os-c-tertiary">Last ran {formatDateTime(job.last_run.started_at)}</span>
                  </>
                ) : (
                  <span className="os-text-xs os-c-tertiary">Never run yet</span>
                )}
              </div>
              {job.last_run?.summary && <p className="os-mt-1 os-mb-0 os-text-sm os-c-primary">{job.last_run.summary}</p>}
              {job.checks.length > 0 && (
                <details className="os-agent-checks os-mt-2">
                  <summary className="os-text-sm os-c-accent-dark os-pointer">What it checks ({job.checks.length})</summary>
                  <ul>
                    {job.checks.map((c) => <li key={c.key}><span className="os-fw-600">{c.title}.</span> {c.description}</li>)}
                  </ul>
                </details>
              )}
            </div>

            <div className="os-flex os-items-center os-gap-3 os-shrink-0">
              <Button size="small" icon={<CaretRightOutlined />} disabled={!job.enabled} loading={runNow.isPending && runNow.variables === job.name} onClick={() => runNow.mutate(job.name)}>Run now</Button>
              {!job.can_disable ? (
                <Tooltip title="Always on, cannot be turned off"><Tag variant="filled">Always on</Tag></Tooltip>
              ) : (
                <Switch aria-label={`Enable ${job.title}`} checked={job.enabled} loading={setEnabled.isPending && setEnabled.variables?.name === job.name} onChange={(checked) => setEnabled.mutate({ name: job.name, enabled: checked })} />
              )}
            </div>
          </div>
        ))}
      </div>

      <WorkflowAgents />
    </div>
  );
}