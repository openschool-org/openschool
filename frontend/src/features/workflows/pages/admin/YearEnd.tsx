import { Link } from "react-router";
import { Button, Tag } from "@carbon/react";
import { ArrowRight } from "@carbon/icons-react";
import { useWorkflowCatalog } from "@/features/workflows/queries/useWorkflows";
import { RUN_STATE_TAG } from "@/features/workflows/runState";
import ListState from "@/shared/ui/ListState";
import InfoTip from "@/shared/ui/InfoTip";
import { formatDateTime } from "@/shared/lib/date";

// The year-end pipeline in order. Each card is one deterministic workflow from the backend catalogue.
export default function YearEnd() {
  const { data: catalog, isLoading, isError, refetch } = useWorkflowCatalog();

  return (
    <div className="os-page">
      <div className="os-page__header">
        <div className="os-page__header-left">
          <h1 className="os-page__title">Year-end</h1>
          <div className="os-page__subtitle os-page__subtitle--tip">
            Prepare next year step by step. Nothing changes until you review and apply.
            <InfoTip>Every step proposes first, shows why it decided each row, and can be undone until real attendance or marks depend on it. Each step can also be done by hand on the usual pages.</InfoTip>
          </div>
        </div>
        <Button kind="tertiary" size="md" as={Link} to="/promotion">Promote by hand</Button>
      </div>

      <ListState
        isLoading={isLoading}
        isError={isError}
        onRetry={refetch}
        errorMessage="Could not load the year-end steps."
        isEmpty={!catalog?.length}
        empty={{ title: "No year-end steps available", description: "The server did not return any workflows." }}
        skeleton={<div className="os-section os-p-6">Loading…</div>}
      >
        <ol className="os-pipeline">
          {catalog?.map((w) => (
            <li key={w.key} className="os-pipeline__item">
              <span className="os-pipeline__number" aria-hidden="true">{w.order}</span>
              <div className="os-flex-1 os-min-w-0">
                <div className="os-flex os-items-center os-gap-2 os-wrap">
                  <h2 className="os-pipeline__title">{w.title}</h2>
                  {w.last_run && <Tag type={RUN_STATE_TAG[w.last_run.state].type} size="sm">{RUN_STATE_TAG[w.last_run.state].label}</Tag>}
                </div>
                <p className="os-m-0 os-text-sm os-c-secondary">{w.description}</p>
                {w.last_run?.summary && (
                  <p className="os-mt-1 os-mb-0 os-text-xs os-c-tertiary">
                    {w.last_run.summary} · {formatDateTime(w.last_run.applied_at ?? w.last_run.created_at)}
                  </p>
                )}
              </div>
              <Button kind="ghost" size="sm" renderIcon={ArrowRight} as={Link} to={`/year-end/${w.key}`}>
                Open
              </Button>
            </li>
          ))}
        </ol>
      </ListState>
    </div>
  );
}
