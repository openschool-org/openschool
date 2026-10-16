import { useState } from "react";
import DataGrid, { type GridColumn } from "@/shared/ui/DataGrid";
import ListState from "@/shared/ui/ListState";
import TableSkeleton from "@/shared/ui/TableSkeleton";
import { usePersistedPageSize } from "@/shared/hooks/usePersistedPageSize";
import type { TeacherBalance } from "@/features/leave/api/leave";
import { useLeaveBalances } from "@/features/leave/queries/useLeave";

const left = (used: number, of: number) => `${used} / ${of}`;

const COLUMNS: GridColumn<TeacherBalance>[] = [
  { key: "employee", header: "Employee no.", render: (b) => <span className="os-table__mono">{b.employee_number}</span> },
  { key: "name", header: "Teacher", render: (b) => b.teacher_name },
  { key: "casual", header: "Casual (used / 21)", render: (b) => left(b.casual_days, 21) },
  { key: "sick", header: "Medical (used / 20)", render: (b) => left(b.sick_days, 20) },
  { key: "short", header: "Short leaves", render: (b) => b.short_count },
  { key: "duty", header: "Duty", render: (b) => b.duty_days },
  { key: "maternity", header: "Maternity", render: (b) => b.maternity_days },
  { key: "no_pay", header: "No-pay", render: (b) => b.no_pay_days },
];

// Approved leave per teacher for the year: the balance side of the leave register.
export default function LeaveBalancesTable({ year, search }: { year: number; search: string }) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = usePersistedPageSize("leave-balances");
  const { data, isLoading, isError, refetch } = useLeaveBalances({ year, search, limit: pageSize, offset: (page - 1) * pageSize });
  return (
    <ListState
      isLoading={isLoading}
      isError={isError}
      isEmpty={(data?.items ?? []).length === 0}
      errorMessage="Failed to load leave balances"
      onRetry={refetch}
      skeleton={<TableSkeleton headers={COLUMNS.map((c) => c.header)} />}
      empty={{ title: "No teachers found", description: "Adjust the search to see leave balances." }}
    >
      <DataGrid
        rows={data?.items ?? []}
        columns={COLUMNS}
        getRowId={(b) => b.teacher_id}
        countLabel={(shown, total) => `Showing ${shown} of ${total} teachers`}
        server={{ page, pageSize, totalItems: data?.total ?? 0, onChange: ({ page: p, pageSize: ps }) => { setPage(p); setPageSize(ps); } }}
      />
    </ListState>
  );
}
