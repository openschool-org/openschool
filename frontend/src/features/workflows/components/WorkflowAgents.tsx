import { Link } from "react-router";
import { Button, SkeletonText, Tag } from "@carbon/react";
import { ArrowRight } from "@carbon/icons-react";
import { useWorkflowCatalog } from "@/features/workflows/queries/useWorkflows";
import { RUN_STATE_TAG } from "@/features/workflows/runState";
import ErrorMessage from "@/shared/ui/ErrorMessage";
import { formatDateTime } from "@/shared/lib/date";

// The year-end workflow agents, listed on the Automation page next to the scheduled checks.
// They run only when someone proposes and applies them, so they have no schedule or toggle.
export default function WorkflowAgents() {
  const { data: catalog, isLoading, isError, refetch } = useWorkflowCatalog();

  return (
    <div className="os-section">
      <div className="os-section__header">
        <h2 className="os-section__title">Year-end workflows</h2>
        <span className="os-section__meta">Run on request from Year-end</span>
      </div>
      {isLoading && (
        <div className="os-py-5 os-px-6">
          <SkeletonText width="60%" />
        </div>
      )}
      {isError && (
        <div className="os-p-6">
          <ErrorMessage message="Could not load the year-end workflows." onRetry={refetch} />
        </div>
      )}
      {catalog?.map((w, i) => (
        <div key={w.key} className={`os-flex os-items-start os-justify-between os-gap-6 os-py-4 os-px-6 os-wrap ${i < catalog.length - 1 ? "os-border-b" : ""}`}>
          <div className="os-flex-1 os-min-w-20">
            <div className="os-flex os-items-center os-gap-2h os-wrap">
              <span className="os-fw-600 os-text-md">{w.order}. {w.title}</span>
              <Tag type="purple" size="sm">On request</Tag>
              {w.last_run && <Tag type={RUN_STATE_TAG[w.last_run.state].type} size="sm">{RUN_STATE_TAG[w.last_run.state].label}</Tag>}
            </div>
            <p className="os-mt-1 os-mx-0 os-mb-0 os-text-sm os-c-secondary">{w.description}</p>
            <details className="os-agent-checks os-mt-2">
              <summary className="os-text-sm os-c-accent-dark os-pointer">Steps and tools ({w.steps.length})</summary>
              <ul>
                {w.steps.map((s) => {
                  const tool = w.tools.find((t) => t.name === s.tool);
                  return (
                    <li key={s.key}>
                      <span className="os-fw-600">{s.title}.</span> {tool?.description}{" "}
                      <span className="os-text-xs os-c-tertiary">{s.phase === "apply" ? "Writes on apply" : "Read only, while proposing"}</span>
                    </li>
                  );
                })}
              </ul>
            </details>
            {w.last_run ? (
              <p className="os-mt-2h os-mx-0 os-mb-0 os-text-xs os-c-tertiary">
                {w.last_run.summary ? `${w.last_run.summary} · ` : ""}Last run {formatDateTime(w.last_run.applied_at ?? w.last_run.created_at)}
              </p>
            ) : (
              <p className="os-mt-2h os-mx-0 os-mb-0 os-text-xs os-c-tertiary">Never run yet</p>
            )}
          </div>
          <Button kind="ghost" size="sm" renderIcon={ArrowRight} as={Link} to={`/year-end/${w.key}`}>
            Open
          </Button>
        </div>
      ))}
    </div>
  );
}
