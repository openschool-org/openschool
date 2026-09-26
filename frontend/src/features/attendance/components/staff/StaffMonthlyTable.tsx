import { useState } from "react";
import { useStaffMonthly } from "@/features/attendance/queries/useStaffAttendance";
import type { StaffKind } from "@/features/attendance/api/staffAttendance";
import { usePersistedPageSize } from "@/shared/hooks/usePersistedPageSize";
import DataGrid from "@/shared/ui/DataGrid";
import ListState from "@/shared/ui/ListState";
import TableSkeleton from "@/shared/ui/TableSkeleton";

interface Props {
  year: number;
  month: number;
  kind: StaffKind;
  search: string;
}

const HEADERS = ["Name", "Present", "Late", "Absent", "Leave"];

export default function StaffMonthlyTable({ year, month, kind, search }: Props) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = usePersistedPageSize("staff-attendance-monthly");
  const { data, isLoading, isError, refetch } = useStaffMonthly(year, month, { kind, search, limit: pageSize, offset: (page - 1) * pageSize });

  return (
    <div className="os-section">
      <ListState
        isLoading={isLoading}
        isError={isError}
        onRetry={refetch}
        errorMessage="Could not load the monthly summary."
        isEmpty={!data?.items.length}
        empty={{ title: search ? "No one matches your search" : "No active staff", description: search ? "Try another name or employee number." : "Nothing to summarise for this month." }}
        skeleton={<TableSkeleton headers={HEADERS} />}
      >
        <DataGrid
          rows={data?.items ?? []}
          getRowId={(r) => r.staff_id}
          noHover
          pageSizes={[25, 50, 100]}
          server={{
            page,
            pageSize,
            totalItems: data?.total ?? 0,
            onChange: ({ page: p, pageSize: ps }) => {
              setPage(ps === pageSize ? p : 1);
              setPageSize(ps);
            },
          }}
          columns={[
            { key: "name", header: "Name", render: (r) => <span className="os-fw-500">{r.full_name}</span> },
            { key: "present", header: "Present", align: "end", render: (r) => r.present_count },
            { key: "late", header: "Late", align: "end", render: (r) => r.late_count },
            { key: "absent", header: "Absent", align: "end", render: (r) => r.absent_count },
            { key: "leave", header: "Leave", align: "end", render: (r) => r.leave_count },
          ]}
        />
      </ListState>
    </div>
  );
}
