import { Alert, Card, Collapse } from "antd";
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
          <Card key={s.label} className="os-dash-stat">
            <p className="os-dash-stat__label">{s.label}</p>
            <p className="os-dash-stat__value">{s.value}</p>
          </Card>
        ))}
      </div>
      {(run.proposal.warnings ?? []).map((w) => (
        <Alert key={w} type="warning" showIcon title="Check this" description={w} />
      ))}
      {run.error && <Alert type="error" showIcon title="This run failed" description={run.error} />}
      {run.proposal.sections.map((section) => (
        <ProposalSection key={section.key} section={section} editable={editable} busyRowId={editingRow} onEdit={(rowId, cells) => onEdit(section.key, rowId, cells)} />
      ))}
      <Collapse
        className="os-workflow-trace"
        items={[{ key: "trace", label: `Steps this run took (${run.trace.length})`, children: <TraceList steps={run.trace} /> }]}
      />
    </div>
  );
}
