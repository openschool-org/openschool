import { useState } from "react";
import { Link, useParams } from "react-router";
import { Button, Card, Col, Row, Tag } from "antd";
import { ArrowLeftOutlined, CheckOutlined, DeleteOutlined, FileSearchOutlined, SafetyCertificateOutlined, UndoOutlined } from "@ant-design/icons";
import { useWorkflowPage } from "@/features/workflows/hooks/useWorkflowPage";
import WorkflowInputs from "@/features/workflows/components/WorkflowInputs";
import StepStrip from "@/features/workflows/components/StepStrip";
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
  // Titles only on the strip; what each step does shows on hover.
  const stepItems = entry.steps.map((st, i) => ({
    key: `${st.tool}-${i}`,
    title: st.title,
    hint: `${toolByName.get(st.tool)?.description ?? ""} ${st.phase === "apply" ? "Saves when you apply." : "Checks only."}`.trim(),
  }));
  const firstApply = entry.steps.findIndex((st) => st.phase === "apply");
  const reviewAt = firstApply < 0 ? stepItems.length : firstApply;
  stepItems.splice(reviewAt, 0, { key: "review", title: "Review the preview", hint: "You look through the proposal and decide. Nothing is saved before this." });
  const current = !run ? 0 : run.state === "applied" ? stepItems.length : run.state === "proposed" ? reviewAt : 0;

  return (
    <div className="os-page">
      <div className="os-workflow-head">
        <Link to={backTo} className="os-workflow-head__back"><ArrowLeftOutlined /> {backLabel}</Link>
        {entry.order > 0 && <p className="os-workflow-head__eyebrow">Year-end · Step {entry.order}</p>}
        <div className="os-workflow-head__row">
          <h1 className="os-page__title os-m-0">{entry.title}</h1>
          {run && <Tag color={RUN_STATE_TAG[run.state].color} variant="filled">{RUN_STATE_TAG[run.state].label}</Tag>}
        </div>
        <p className="os-page__subtitle os-max-w-50 os-m-0">{entry.description}</p>
      </div>

      <Row gutter={[24, 24]} className="os-form-columns os-mb-6">
        <Col xs={24} lg={15}>
          <Card className="os-form-card os-workflow-setup" title="Set up">
            <WorkflowInputs fields={entry.inputs} values={p.values} onChange={p.setValue} />
            <div className="os-workflow-setup__actions">
              <Button icon={<SafetyCertificateOutlined />} onClick={p.runCheck} loading={p.busy.check}>{p.busy.check ? "Checking…" : "Check readiness"}</Button>
              <Button type="primary" icon={<FileSearchOutlined />} onClick={p.runPropose} loading={p.busy.propose}>
                {p.busy.propose ? "Working it out…" : "Create proposal"}
              </Button>
            </div>
          </Card>
        </Col>
        <Col xs={24} lg={9}>
          <Card className="os-form-card os-mb-6" title="Progress">
            <StepStrip steps={stepItems} current={current} failed={run?.state === "failed"} />
          </Card>
          <Card className="os-form-card" title="Readiness">
            {p.checks.length === 0 ? (
              <p className="os-m-0 os-text-sm os-c-tertiary">Choose Check readiness to see whether everything this step needs is in place. Nothing is changed.</p>
            ) : (
              <ChecksList checks={p.checks} />
            )}
          </Card>
        </Col>
      </Row>

      {run && (
        <div className="os-section os-mb-6">
          <div className="os-section__header os-tt-head">
            <div>
              <h2 className="os-section__title">Proposal</h2>
              <p className="os-text-sm os-c-secondary os-m-0">
                {run.state === "proposed" ? "Nothing is saved yet. Adjust any editable cells, then apply." : "What this run worked out."}
              </p>
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
          <div className="os-section__body">
            <ProposalView run={run} onEdit={p.editCell} editingRow={p.editingRow} />
          </div>
        </div>
      )}

      <Card className="os-dash-card is-flush" title="History">
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
