import { Link } from "react-router";
import { Button, SkeletonText, Tag } from "@carbon/react";
import { ArrowRight } from "@carbon/icons-react";
import { useWorkflowCatalog } from "@/features/workflows/queries/useWorkflows";
import type { CatalogEntry } from "@/features/workflows/api/workflows";
import { RUN_STATE_TAG } from "@/features/workflows/runState";
import ErrorMessage from "@/shared/ui/ErrorMessage";
import { formatDateTime } from "@/shared/lib/date";

// Setup tools open from their own pages rather than the year-end pipeline.
const SETUP_PATHS: Record<string, string> = { student_import: "/students/import" };

const pathFor = (w: CatalogEntry) => (w.group === "setup" ? SETUP_PATHS[w.key] ?? `/year-end/${w.key}` : `/year-end/${w.key}`);

function WorkflowRow({ w, last }: { w: CatalogEntry; last: boolean }) {
  return (
    <div className={`os-flex os-items-start os-justify-between os-gap-6 os-py-4 os-px-6 os-wrap ${last ? "" : "os-border-b"}`}>
      <div className="os-flex-1 os-min-w-20">
        <div className="os-flex os-items-center os-gap-2h os-wrap">
          <span className="os-fw-600 os-text-md">{w.order > 0 ? `${w.order}. ` : ""}{w.title}</span>
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
        <p className="os-mt-2h os-mx-0 os-mb-0 os-text-xs os-c-tertiary">
          {w.last_run
            ? `${w.last_run.summary ? `${w.last_run.summary} · ` : ""}Last run ${formatDateTime(w.last_run.applied_at ?? w.last_run.created_at)}`
            : "Never run yet"}
        </p>
      </div>
      <Button kind="ghost" size="sm" renderIcon={ArrowRight} as={Link} to={pathFor(w)}>
        Open
      </Button>
    </div>
  );
}

function WorkflowSection({ title, meta, entries, loading, error }: { title: string; meta: string; entries: CatalogEntry[]; loading: boolean; error?: React.ReactNode }) {
  return (
    <div className="os-section os-mt-6">
      <div className="os-section__header">
        <h2 className="os-section__title">{title}</h2>
        <span className="os-section__meta">{meta}</span>
      </div>
      {loading && (
        <div className="os-py-5 os-px-6">
          <SkeletonText width="60%" />
        </div>
      )}
      {error}
      {entries.map((w, i) => <WorkflowRow key={w.key} w={w} last={i === entries.length - 1} />)}
    </div>
  );
}

// The on-request workflows listed on the Automation page next to the scheduled agents. They run only when
// someone proposes and applies them, so they have no schedule or toggle.
export default function WorkflowAgents() {
  const { data: catalog, isLoading, isError, refetch } = useWorkflowCatalog();
  const yearEnd = catalog?.filter((w) => w.group === "year_end") ?? [];
  const setup = catalog?.filter((w) => w.group === "setup") ?? [];
  const error = isError ? (
    <div className="os-p-6">
      <ErrorMessage message="Could not load the workflows." onRetry={refetch} />
    </div>
  ) : null;

  return (
    <>
      <WorkflowSection title="Year-end workflows" meta="Run on request from Year-end, in this order" entries={yearEnd} loading={isLoading} error={error} />
      {(isLoading || setup.length > 0) && (
        <WorkflowSection title="Setup tools" meta="Run on request, for example from Students" entries={setup} loading={isLoading} />
      )}
    </>
  );
}
