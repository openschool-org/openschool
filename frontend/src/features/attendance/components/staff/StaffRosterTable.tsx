import { useState } from "react";
import { Button, Tag } from "antd";
import { CloseCircleOutlined } from "@ant-design/icons";
import { useStaffRoster, useMarkStaffAttendance, useMarkUnmarkedAbsent } from "@/features/attendance/queries/useStaffAttendance";
import type { StaffAttendanceStatus, StaffKind } from "@/features/attendance/api/staffAttendance";
import StaffStatusButton from "@/features/attendance/components/staff/StaffStatusButton";
import { STAFF_STATUSES } from "@/shared/lib/constants/attendance";
import { usePersistedPageSize } from "@/shared/hooks/usePersistedPageSize";
import { useToast } from "@/shared/ui/toast/useToast";
import ConfirmActionModal from "@/shared/ui/ConfirmActionModal";
import ListState from "@/shared/ui/ListState";
import TableSkeleton from "@/shared/ui/TableSkeleton";
import Avatar from "@/shared/ui/Avatar";
import DataGrid, { type GridColumn } from "@/shared/ui/DataGrid";
import type { StaffAttendanceRow } from "@/features/attendance/api/staffAttendance";

interface Props {
  date: string;
  kind: StaffKind;
  search: string;
}

// One server-paginated day roster; status buttons save immediately, one row at a time.
export default function StaffRosterTable({ date, kind, search }: Props) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = usePersistedPageSize("staff-attendance");
  const [markingId, setMarkingId] = useState<string | null>(null);
  const { showToast } = useToast();
  const params = { kind, search, limit: pageSize, offset: (page - 1) * pageSize };
  const { data, isLoading, isError, refetch } = useStaffRoster(date, params);
  const mark = useMarkStaffAttendance();
  const markUnmarked = useMarkUnmarkedAbsent();
  const [confirmBulkAbsent, setConfirmBulkAbsent] = useState(false);
  const noun = (n: number) => (kind === "teacher" ? (n === 1 ? "teacher" : "teachers") : n === 1 ? "staff member" : "staff members");

  const onMark = (staffId: string, status: StaffAttendanceStatus) => {
    setMarkingId(staffId);
    mark.mutate(
      { ...(kind === "teacher" ? { teacher_id: staffId } : { non_academic_staff_id: staffId }), date: new Date(date).toISOString(), status },
      {
        onSettled: () => setMarkingId(null),
        onError: () => showToast({ kind: "error", title: "Could not save attendance", subtitle: "Please try again." }),
      },
    );
  };

  const onMarkUnmarked = () =>
    markUnmarked.mutate(
      { date, kind },
      {
        onSuccess: ({ marked }) => showToast({ kind: "success", title: `Marked ${marked} ${noun(marked)} absent` }),
        onError: () => showToast({ kind: "error", title: "Could not mark attendance", subtitle: "Please try again." }),
      },
    );

  const totals = data?.totals;

  const columns: GridColumn<StaffAttendanceRow>[] = [
    {
      key: "name",
      header: "Name",
      render: (row) => (
        <div className="os-flex os-items-center os-gap-2">
          <Avatar name={row.full_name} size="sm" />
          <span className="os-fw-500">{row.full_name}</span>
        </div>
      ),
    },
    { key: "employee_number", header: "Employee no.", render: (row) => <span className="os-table__mono">{row.employee_number}</span> },
    {
      key: "attendance",
      header: "Attendance",
      render: (row) => (
        <div className={`os-flex os-gap-1h os-wrap ${markingId === row.staff_id ? "os-opacity-50" : ""}`}>
          {STAFF_STATUSES.map((st) => (
            <StaffStatusButton key={st} value={st} selected={row.status === st} personName={row.full_name} onClick={() => onMark(row.staff_id, st)} />
          ))}
        </div>
      ),
    },
  ];

  return (
    <div className="os-section">
      <div className="os-section__header os-wrap os-gap-3">
        <div className="os-flex os-gap-2 os-wrap" aria-live="polite">
          {totals && (
            <>
              <Tag color="success" variant="filled">Present {totals.present}</Tag>
              <Tag color="warning" variant="filled">Late {totals.late}</Tag>
              <Tag color="error" variant="filled">Absent {totals.absent}</Tag>
              <Tag color="blue" variant="filled">Leave {totals.leave}</Tag>
              <Tag variant="filled">Not marked {totals.unmarked}</Tag>
            </>
          )}
        </div>
        <Button danger size="small" icon={<CloseCircleOutlined />} onClick={() => setConfirmBulkAbsent(true)} disabled={!totals?.unmarked} loading={markUnmarked.isPending}>
          {markUnmarked.isPending ? "Marking…" : "Mark all unmarked as absent"}
        </Button>
      </div>

      <ListState
        isLoading={isLoading}
        isError={isError}
        onRetry={refetch}
        errorMessage="Could not load staff attendance."
        isEmpty={!data?.items.length}
        empty={{ title: search ? "No one matches your search" : "No active staff", description: search ? "Try another name or employee number." : "Add people on the Teachers or Staff page first." }}
        skeleton={<TableSkeleton headers={["Name", "Employee no.", "Attendance"]} />}
      >
        <DataGrid
          rows={data?.items ?? []}
          columns={columns}
          getRowId={(row) => row.staff_id}
          noHover
          pageSizes={[25, 50, 100]}
          server={{ page, pageSize, totalItems: data?.total ?? 0, onChange: ({ page: p, pageSize: ps }) => { setPage(p); setPageSize(ps); } }}
        />
      </ListState>
      <ConfirmActionModal
        open={confirmBulkAbsent}
        title="Mark unmarked staff as absent"
        description={`This will mark every active ${noun(2)} with no attendance record for this date as absent, including people outside the current search. Existing attendance marks will not change.`}
        confirmLabel="Mark as absent"
        danger
        pending={markUnmarked.isPending}
        onClose={() => setConfirmBulkAbsent(false)}
        onConfirm={() => { onMarkUnmarked(); setConfirmBulkAbsent(false); }}
      />
    </div>
  );
}
