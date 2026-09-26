import { Tag } from "@carbon/react";
import type { RunSummary } from "@/features/workflows/api/workflows";
import { RUN_STATE_TAG } from "@/features/workflows/runState";
import { formatDateTime } from "@/shared/lib/date";
import DataGrid from "@/shared/ui/DataGrid";


export default function RunHistory({ runs, onOpen }: { runs: RunSummary[]; onOpen: (id: string) => void }) {
  if (runs.length === 0) return <p className="os-px-6 os-py-4 os-m-0 os-text-sm os-c-tertiary">No runs yet.</p>;
  return (
    <DataGrid
      rows={runs}
      getRowId={(r) => r.id}
      pagination={false}
      onRowClick={(r) => onOpen(r.id)}
      columns={[
        { key: "created", header: "Proposed", render: (r) => formatDateTime(r.created_at) },
        { key: "by", header: "By", render: (r) => r.created_by_name ?? "-" },
        { key: "state", header: "State", render: (r) => <Tag type={RUN_STATE_TAG[r.state].type} size="sm">{RUN_STATE_TAG[r.state].label}</Tag> },
        { key: "summary", header: "Result", render: (r) => r.summary ?? r.error ?? "-" },
        { key: "applied", header: "Applied", render: (r) => (r.applied_at ? `${formatDateTime(r.applied_at)}${r.applied_by_name ? ` by ${r.applied_by_name}` : ""}` : "-") },
      ]}
    />
  );
}
