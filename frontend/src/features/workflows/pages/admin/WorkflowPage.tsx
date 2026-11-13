import { useState } from "react";
import { Link, useParams } from "react-router";
import { Button, Card, Col, Row, Steps, Tag } from "antd";
import { ArrowLeftOutlined, CheckOutlined, DeleteOutlined, FileSearchOutlined, UndoOutlined } from "@ant-design/icons";
import LinkButton from "@/shared/ui/LinkButton";
import { useWorkflowPage } from "@/features/workflows/hooks/useWorkflowPage";
import WorkflowInputs from "@/features/workflows/components/WorkflowInputs";
import ChecksList from "@/features/workflows/components/ChecksList";
import ProposalView from "@/features/workflows/components/ProposalView";
import RunHistory from "@/features/workflows/components/RunHistory";
import { RUN_STATE_TAG } from "@/features/workflows/runState";
import ConfirmActionModal from "@/features/workflows/components/ConfirmActionModal";
import { usePageTitle } from "@/shared/hooks/usePageTitle";
import LoadingSpinner from "@/shared/ui/LoadingSpinner";
import EmptyState from "@/shared/ui/EmptyState";

interface Props {
  // Fixed workflow for pages outside year-end, such as /students/import.
  workflowKey?: string;
  backTo?: string;
  backLabel?: string;
}

// One workflow: its steps and tools, the form, preconditions, the proposal to review, and its history.
export default function WorkflowPage({ workflowKey, backTo = "/year-end", backLabel = "All steps" }: Props) {
  const params = useParams();
  const key = workflowKey ?? params.key ?? "";
  const p = useWorkflowPage(key);
  const [confirm, setConfirm] = useState<"apply" | "revert" | null>(null);
  usePageTitle(p.entry?.title);

  if (p.catalog.isLoading) return <LoadingSpinner />;
  if (!p.entry) {
    return (
      <div className="os-page">
        <EmptyState title="Workflow not found" description="It may have been renamed." action={<Link to={backTo} className="os-table__link">Go back</Link>} />
      </div>
    );
  }
  const { entry } = p;
  const run = p.run.data;
  const toolByName = new Map(entry.tools.map((t) => [t.name, t]));
  // The backend's steps, with "Review the preview" placed before the first step that saves:
  // checking finishes when a proposal exists, review is current while it waits, saving finishes on apply.
  const stepItems = entry.steps.map((st) => ({
    title: st.title,
    description: (
      <span className="os-flex os-col os-gap-1">
        <span>{toolByName.get(st.tool)?.description}</span>
        <span>
          <Tag color={st.phase === "apply" ? "magenta" : undefined} variant="filled">
            {st.phase === "apply" ? "Saves when you apply" : "Checks only"}
          </Tag>
        </span>
      </span>
    ),
  }));
  const firstApply = entry.steps.findIndex((st) => st.phase === "apply");
  const reviewAt = firstApply < 0 ? stepItems.length : firstApply;
  stepItems.splice(reviewAt, 0, {
    title: "Review the preview",
    description: <span>Look through the rows the check produces, fix anything marked, then choose Review done, apply.</span>,
  });
  const current = !run ? 0 : run.state === "applied" ? stepItems.length : run.state === "proposed" ? reviewAt : 0;

  return (
    <div className="os-page">
      {/* Title and back link share one line; the description sits below at full width. */}
      <div className="os-workflow-head">
        <div className="os-workflow-head__row">
          <h1 className="os-page__title os-m-0">{entry.order > 0 ? `${entry.order}. ` : ""}{entry.title}</h1>
          <LinkButton to={backTo} icon={<ArrowLeftOutlined />}>{backLabel}</LinkButton>
        </div>
        <p className="os-page__subtitle os-max-w-50">{entry.description}</p>
      </div>

      <Row gutter={24} className="os-form-columns">
        <Col xs={24} lg={16}>
          <Card className="os-form-card" title="Set up">
            <div className="os-flex os-col os-gap-5">
              <WorkflowInputs fields={entry.inputs} values={p.values} onChange={p.setValue} />
              <ChecksList checks={p.checks} />
              <div className="os-flex os-gap-2 os-wrap">
                <Button size="large" onClick={p.runCheck} loading={p.busy.check}>{p.busy.check ? "Checking…" : "Check"}</Button>
                <Button size="large" type="primary" icon={<FileSearchOutlined />} onClick={p.runPropose} loading={p.busy.propose}>
                  {p.busy.propose ? "Working it out…" : "Create proposal"}
                </Button>
              </div>
            </div>
          </Card>
        </Col>
        <Col xs={24} lg={8}>
          <Card className="os-form-card" title="How it works">
            <Steps
              orientation="vertical"
              size="small"
              current={current}
              status={run?.state === "failed" ? "error" : undefined}
              items={stepItems}
            />
          </Card>
        </Col>
      </Row>

      {run && (
        <div className="os-mb-6">
          <div className="os-flex os-items-center os-justify-between os-gap-4 os-wrap os-mb-4">
            <div className="os-flex os-items-center os-gap-2">
              <h2 className="os-workflow-run__title">This run</h2>
              <Tag color={RUN_STATE_TAG[run.state].color} variant="filled">{RUN_STATE_TAG[run.state].label}</Tag>
            </div>
            <div className="os-flex os-gap-2">
              {run.state === "proposed" && (
                <>
                  <Button type="text" icon={<DeleteOutlined />} onClick={p.runDiscard} loading={p.busy.discard}>Discard</Button>
                  <Button type="primary" icon={<CheckOutlined />} onClick={() => setConfirm("apply")}>Review done, apply</Button>
                </>
              )}
              {run.state === "applied" && <Button danger icon={<UndoOutlined />} onClick={() => setConfirm("revert")}>Revert</Button>}
            </div>
          </div>
          <ProposalView run={run} onEdit={p.editCell} editingRow={p.editingRow} />
        </div>
      )}

      <Card className="os-dash-card" title="History">
        <RunHistory runs={p.history.data ?? []} onOpen={p.openRun} />
      </Card>

      <ConfirmActionModal
        open={confirm === "apply"}
        title={`Apply ${entry.title.toLowerCase()}?`}
        body="This writes the reviewed proposal in one step. It can be reverted until real data depends on it; if not, the server says why."
        confirmLabel="Apply"
        busy={p.busy.apply}
        onCancel={() => setConfirm(null)}
        onConfirm={() => p.runApply(() => setConfirm(null))}
      />
      <ConfirmActionModal
        open={confirm === "revert"}
        danger
        title="Revert this run?"
        body="Everything this run changed is undone. The server refuses if real data already depends on it."
        confirmLabel="Revert"
        busy={p.busy.revert}
        onCancel={() => setConfirm(null)}
        onConfirm={() => p.runRevert(() => setConfirm(null))}
      />
    </div>
  );
}
