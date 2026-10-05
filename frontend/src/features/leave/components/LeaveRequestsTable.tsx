import { useState } from "react";
import { Button } from "@carbon/react";
import DataGrid, { type GridColumn } from "@/shared/ui/DataGrid";
import ListState from "@/shared/ui/ListState";
import TableSkeleton from "@/shared/ui/TableSkeleton";
import { usePersistedPageSize } from "@/shared/hooks/usePersistedPageSize";
import type { LeaveRequest } from "@/features/leave/api/leave";
import { LEAVE_TYPE_LABELS } from "@/features/leave/constants";
import { useLeaveRegister } from "@/features/leave/queries/useLeave";
import LeaveStatusTag from "@/features/leave/components/LeaveStatusTag";
import LeaveReviewModal from "@/features/leave/components/LeaveReviewModal";
import { leaveDates, leaveDays } from "@/features/leave/components/leaveText";

interface Props {
  year: number;
  search: string;
  status: string;
  leaveType: string;
}

// The applications side of the leave register; pending ones come first.
export default function LeaveRequestsTable({ year, search, status, leaveType }: Props) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = usePersistedPageSize("leave-register");
  const [reviewing, setReviewing] = useState("");
  const { data, isLoading, isError, refetch } = useLeaveRegister({
    year, search, status, leave_type: leaveType, limit: pageSize, offset: (page - 1) * pageSize,
  });

  const columns: GridColumn<LeaveRequest>[] = [
    { key: "teacher", header: "Teacher", render: (r) => r.teacher_name },
    { key: "type", header: "Leave", render: (r) => LEAVE_TYPE_LABELS[r.leave_type] },
    { key: "dates", header: "Dates", render: (r) => leaveDates(r) },
    { key: "days", header: "Days", render: (r) => leaveDays(r) },
    { key: "reason", header: "Reason", render: (r) => <span className="os-table__muted">{r.reason}</span> },
    { key: "status", header: "Status", render: (r) => <LeaveStatusTag status={r.status} /> },
    {
      key: "actions",
      header: "Actions",
      align: "end",
      render: (r) => (
        <Button kind={r.status === "pending" ? "tertiary" : "ghost"} size="sm" onClick={() => setReviewing(r.id)}>
          {r.status === "pending" ? "Review" : "View"}
        </Button>
      ),
    },
  ];

  return (
    <>
      <ListState
        isLoading={isLoading}
        isError={isError}
        isEmpty={(data?.items ?? []).length === 0}
        errorMessage="Failed to load leave applications"
        onRetry={refetch}
        skeleton={<TableSkeleton headers={columns.map((c) => c.header)} />}
        empty={{ title: "No leave applications", description: "Applications teachers make appear here for approval." }}
      >
        <DataGrid
          rows={data?.items ?? []}
          columns={columns}
          getRowId={(r) => r.id}
          countLabel={(shown, total) => `Showing ${shown} of ${total} applications`}
          server={{ page, pageSize, totalItems: data?.total ?? 0, onChange: ({ page: p, pageSize: ps }) => { setPage(p); setPageSize(ps); } }}
        />
      </ListState>
      {reviewing && <LeaveReviewModal id={reviewing} onClose={() => setReviewing("")} />}
    </>
  );
}
