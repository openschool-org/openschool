import { InlineNotification } from "@carbon/react";
import type { Run } from "@/features/workflows/api/workflows";
import ProposalSection from "@/features/workflows/components/ProposalSection";
import TraceList from "@/features/workflows/components/TraceList";

interface Props {
  run: Run;
  onEdit: (section: string, rowId: string, cells: Record<string, string>) => void;
  editingRow: string | null;
}

// A run's numbers, warnings, tables and step trace; tables are editable only while it is a proposal.
export default function ProposalView({ run, onEdit, editingRow }: Props) {
  const editable = run.state === "proposed";
  return (
    <div className="os-flex os-col os-gap-4">
      <div className="os-stat-grid os-mb-0">
        {run.proposal.summary.map((s) => (
          <div key={s.label} className="os-stat-card">
            <p className="os-stat-card__label">{s.label}</p>
            <p className="os-stat-card__value">{s.value}</p>
          </div>
        ))}
      </div>
      {(run.proposal.warnings ?? []).map((w) => (
        <InlineNotification key={w} kind="warning" lowContrast hideCloseButton title="Check this" subtitle={w} className="os-max-w-full" />
      ))}
      {run.error && <InlineNotification kind="error" lowContrast hideCloseButton title="This run failed" subtitle={run.error} className="os-max-w-full" />}
      {run.proposal.sections.map((section) => (
        <ProposalSection key={section.key} section={section} editable={editable} busyRowId={editingRow} onEdit={(rowId, cells) => onEdit(section.key, rowId, cells)} />
      ))}
      <details className="os-section os-p-4">
        <summary className="os-fw-600 os-pointer">Steps this run took ({run.trace.length})</summary>
        <TraceList steps={run.trace} />
      </details>
    </div>
  );
}
