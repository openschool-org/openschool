import DataGrid, { type GridColumn } from "@/shared/ui/DataGrid";
import ListState from "@/shared/ui/ListState";
import TableSkeleton from "@/shared/ui/TableSkeleton";
import { useMyReliefDuties } from "@/features/leave/queries/useLeave";
import { formatDate } from "@/shared/lib/date";
import type { ReliefDuty } from "@/features/leave/api/leave";

const COLUMNS: GridColumn<ReliefDuty>[] = [
  { key: "date", header: "Date", render: (d) => <span className="os-table__mono">{formatDate(d.date)}</span> },
  { key: "period", header: "Period", render: (d) => d.period_number },
  { key: "class", header: "Class", render: (d) => d.class_name },
  { key: "subject", header: "Subject", render: (d) => <span className="os-table__muted">{d.subject_name || "-"}</span> },
  { key: "for", header: "Covering for", render: (d) => d.absent_teacher_name },
];

// Periods the signed-in teacher has been named to cover for an absent colleague.
export default function MyReliefDuties() {
  const { data, isLoading, isError, refetch } = useMyReliefDuties();
  return (
    <ListState
      isLoading={isLoading}
      isError={isError}
      isEmpty={(data ?? []).length === 0}
      errorMessage="Failed to load relief duties"
      onRetry={refetch}
      skeleton={<TableSkeleton headers={COLUMNS.map((c) => c.header)} />}
      empty={{ title: "No relief duties", description: "When a colleague's approved leave names you for a period, it shows here." }}
    >
      <DataGrid rows={data ?? []} columns={COLUMNS} getRowId={(d) => d.id} pagination={false} />
    </ListState>
  );
}
