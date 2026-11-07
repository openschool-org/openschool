import DataGrid, { type GridColumn } from "@/shared/ui/DataGrid";
import ListState from "@/shared/ui/ListState";
import TableSkeleton from "@/shared/ui/TableSkeleton";
import type { DailyRelief } from "@/features/leave/api/leave";
import { useDailyRelief } from "@/features/leave/queries/useLeave";
import LeaveStatusTag from "@/features/leave/components/LeaveStatusTag";

const COLUMNS: GridColumn<DailyRelief>[] = [
  { key: "period", header: "Period", render: (r) => r.period_number },
  { key: "class", header: "Class", render: (r) => r.class_name },
  { key: "subject", header: "Subject", render: (r) => <span className="os-table__muted">{r.subject_name || "-"}</span> },
  { key: "absent", header: "Absent teacher", render: (r) => r.absent_teacher_name },
  { key: "relief", header: "Relief teacher", render: (r) => r.relief_teacher_name || <span className="os-c-warning-text">Not arranged</span> },
  { key: "status", header: "Leave", render: (r) => <LeaveStatusTag status={r.leave_status} /> },
];

// The day's relief sheet, the list a school posts in the staff room each morning.
export default function DailyReliefTable({ date }: { date: string }) {
  const { data, isLoading, isError, refetch } = useDailyRelief(date);
  return (
    <ListState
      isLoading={isLoading}
      isError={isError}
      isEmpty={(data ?? []).length === 0}
      errorMessage="Failed to load the relief sheet"
      onRetry={refetch}
      skeleton={<TableSkeleton headers={COLUMNS.map((c) => c.header)} />}
      empty={{ title: "No relief needed", description: "No teacher on leave misses a timetabled period on this date." }}
    >
      <DataGrid rows={data ?? []} columns={COLUMNS} getRowId={(r) => r.id} pagination={false} />
    </ListState>
  );
}
