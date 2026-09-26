import { useState } from "react";
import { Link, useParams } from "react-router";
import { Button, Tag } from "@carbon/react";
import { ArrowLeft, Checkmark, Renew, TrashCan, Undo } from "@carbon/icons-react";
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

// One workflow: its steps and tools, the form, preconditions, the proposal to review, and its history.
export default function WorkflowPage() {
  const { key = "" } = useParams();
  const p = useWorkflowPage(key);
  const [confirm, setConfirm] = useState<"apply" | "revert" | null>(null);
  usePageTitle(p.entry?.title);

  if (p.catalog.isLoading) return <LoadingSpinner />;
  if (!p.entry) {
    return (
      <div className="os-page">
        <EmptyState title="Workflow not found" description="It may have been renamed." action={<Link to="/year-end" className="os-table__link">Back to year-end</Link>} />
      </div>
    );
  }
  const { entry } = p;
  const run = p.run.data;
  const toolByName = new Map(entry.tools.map((t) => [t.name, t]));

  return (
    <div className="os-page">
      <div className="os-page__header">
        <div className="os-page__header-left">
          <h1 className="os-page__title">{entry.order}. {entry.title}</h1>
          <p className="os-page__subtitle">{entry.description}</p>
        </div>
        <Button kind="ghost" size="md" renderIcon={ArrowLeft} as={Link} to="/year-end">All steps</Button>
      </div>

      <div className="os-grid os-grid-cols-2-1 os-gap-6 os-items-grid-start">
        <div className="os-section">
          <div className="os-section__header"><h2 className="os-section__title">Set up</h2></div>
          <div className="os-p-6 os-flex os-col os-gap-4">
            <WorkflowInputs fields={entry.inputs} values={p.values} onChange={p.setValue} />
            <ChecksList checks={p.checks} />
            <div className="os-flex os-gap-2 os-wrap">
              <Button kind="secondary" onClick={p.runCheck} disabled={p.busy.check}>{p.busy.check ? "Checking…" : "Check"}</Button>
              <Button kind="primary" renderIcon={Renew} onClick={p.runPropose} disabled={p.busy.propose}>
                {p.busy.propose ? "Working it out…" : "Create proposal"}
              </Button>
            </div>
          </div>
        </div>

        <div className="os-section">
          <div className="os-section__header"><h2 className="os-section__title">Steps and tools</h2></div>
          <ol className="os-steps">
            {entry.steps.map((s) => (
              <li key={s.key}>
                <span className="os-fw-600">{s.title}</span>
                <Tag type={s.phase === "apply" ? "magenta" : "cool-gray"} size="sm">{s.phase === "apply" ? "Writes" : "Reads"}</Tag>
                <p className="os-m-0 os-text-xs os-c-secondary">
                  <code>{s.tool}</code> {toolByName.get(s.tool)?.description}
                </p>
              </li>
            ))}
          </ol>
        </div>
      </div>

      {run && (
        <div className="os-mt-6">
          <div className="os-flex os-items-center os-justify-between os-gap-4 os-wrap os-mb-4">
            <div className="os-flex os-items-center os-gap-2">
              <h2 className="os-section__title os-m-0">This run</h2>
              <Tag type={RUN_STATE_TAG[run.state].type}>{RUN_STATE_TAG[run.state].label}</Tag>
            </div>
            <div className="os-flex os-gap-2">
              {run.state === "proposed" && (
                <>
                  <Button kind="ghost" renderIcon={TrashCan} onClick={p.runDiscard} disabled={p.busy.discard}>Discard</Button>
                  <Button kind="primary" renderIcon={Checkmark} onClick={() => setConfirm("apply")}>Review done, apply</Button>
                </>
              )}
              {run.state === "applied" && <Button kind="danger--tertiary" renderIcon={Undo} onClick={() => setConfirm("revert")}>Revert</Button>}
            </div>
          </div>
          <ProposalView run={run} onEdit={p.editCell} editingRow={p.editingRow} />
        </div>
      )}

      <div className="os-section os-mt-6">
        <div className="os-section__header"><h2 className="os-section__title">History</h2></div>
        <RunHistory runs={p.history.data ?? []} onOpen={p.openRun} />
      </div>

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
