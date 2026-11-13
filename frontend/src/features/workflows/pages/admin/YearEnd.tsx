import { Progress, Skeleton, Tag } from "antd";
import { CheckOutlined, RightOutlined } from "@ant-design/icons";
import { Link } from "react-router";
import LinkButton from "@/shared/ui/LinkButton";
import { useWorkflowCatalog } from "@/features/workflows/queries/useWorkflows";
import { RUN_STATE_TAG } from "@/features/workflows/runState";
import ListState from "@/shared/ui/ListState";
import InfoTip from "@/shared/ui/InfoTip";
import { formatDateTime } from "@/shared/lib/date";

// The year-end pipeline in order. Each card is one deterministic workflow from the backend catalogue.
export default function YearEnd() {
  const { data: allWorkflows, isLoading, isError, refetch } = useWorkflowCatalog();
  const catalog = allWorkflows?.filter((w) => w.group === "year_end");
  const total = catalog?.length ?? 0;
  const applied = catalog?.filter((w) => w.last_run?.state === "applied").length ?? 0;

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
        <LinkButton to="/promotion">Promote by hand</LinkButton>
      </div>

      <ListState
        isLoading={isLoading}
        isError={isError}
        onRetry={refetch}
        errorMessage="Could not load the year-end steps."
        isEmpty={!catalog?.length}
        empty={{ title: "No year-end steps available", description: "The server did not return any workflows." }}
        skeleton={<div className="os-section os-p-6"><Skeleton active paragraph={{ rows: 4 }} /></div>}
      >
        <div className="os-section">
          <div className="os-section__header os-tt-head">
            <div>
              <h2 className="os-section__title">Year-end steps</h2>
              <p className="os-text-sm os-c-secondary os-m-0">Work through them in order. Each step proposes first; you review before anything is applied.</p>
            </div>
            <div className="os-pipeline-progress">
              <span className="os-text-sm os-c-secondary os-nowrap">{applied} of {total} applied</span>
              <Progress percent={total ? Math.round((applied / total) * 100) : 0} showInfo={false} size="small" />
            </div>
          </div>
          <ol className="os-pipeline">
            {catalog?.map((w) => {
              const state = w.last_run?.state;
              return (
                <li key={w.key}>
                  <Link to={`/year-end/${w.key}`} className={`os-pipeline__item${state === "applied" ? " is-done" : state === "proposed" ? " is-pending" : ""}`}>
                    <span className="os-pipeline__number" aria-hidden="true">{state === "applied" ? <CheckOutlined /> : w.order}</span>
                    <div className="os-flex-1 os-min-w-0">
                      <div className="os-flex os-items-center os-gap-2 os-wrap">
                        <h3 className="os-pipeline__title">{w.title}</h3>
                        {state && <Tag color={RUN_STATE_TAG[state].color} variant="filled">{RUN_STATE_TAG[state].label}</Tag>}
                      </div>
                      <p className="os-pipeline__desc">{w.description}</p>
                      {w.last_run?.summary && (
                        <p className="os-mt-1 os-mb-0 os-text-xs os-c-tertiary">
                          {w.last_run.summary} · {formatDateTime(w.last_run.applied_at ?? w.last_run.created_at)}
                        </p>
                      )}
                    </div>
                    <RightOutlined className="os-pipeline__chevron" aria-label="Open" />
                  </Link>
                </li>
              );
            })}
          </ol>
        </div>
      </ListState>
    </div>
  );
}
