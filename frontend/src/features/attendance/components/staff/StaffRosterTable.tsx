import { useState } from "react";
import { Button, Pagination, Tag } from "@carbon/react";
import { CloseFilled } from "@carbon/icons-react";
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
        onSuccess: ({ marked }) => showToast({ kind: "success", title: `Marked ${marked} ${noun(marked)} present` }),
        onError: () => showToast({ kind: "error", title: "Could not mark attendance", subtitle: "Please try again." }),
      },
    );

  const totals = data?.totals;

  return (
    <div className="os-section">
      <div className="os-section__header os-wrap os-gap-3">
        <div className="os-flex os-gap-2 os-wrap" aria-live="polite">
          {totals && (
            <>
              <Tag type="green" size="sm">Present {totals.present}</Tag>
              <Tag type="warm-gray" size="sm">Late {totals.late}</Tag>
              <Tag type="red" size="sm">Absent {totals.absent}</Tag>
              <Tag type="blue" size="sm">Leave {totals.leave}</Tag>
              <Tag type="gray" size="sm">Not marked {totals.unmarked}</Tag>
            </>
          )}
        </div>
      <Button kind="danger--tertiary" size="sm" renderIcon={CloseFilled} onClick={() => setConfirmBulkAbsent(true)} disabled={!totals?.unmarked || markUnmarked.isPending}>
          {markUnmarked.isPending ? "Marking…" : `Mark all ${totals?.unmarked ?? 0} not marked as absent`}
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
        <table className="os-table os-table--stack os-table--no-hover">
          <thead>
            <tr>
              <th>Name</th>
              <th>Employee no.</th>
              <th>Attendance</th>
            </tr>
          </thead>
          <tbody>
            {data?.items.map((row) => (
              <tr key={row.staff_id}>
                <td data-label="Name">
                  <div className="os-flex os-items-center os-gap-2">
                    <Avatar name={row.full_name} size="sm" />
                    <span className="os-fw-500">{row.full_name}</span>
                  </div>
                </td>
                <td data-label="Employee no." className="os-table__mono">{row.employee_number}</td>
                <td data-label="Attendance">
                  <div className={`os-flex os-gap-1h os-wrap ${markingId === row.staff_id ? "os-opacity-50" : ""}`}>
                    {STAFF_STATUSES.map((s) => (
                      <StaffStatusButton key={s} value={s} selected={row.status === s} personName={row.full_name} onClick={() => onMark(row.staff_id, s)} />
                    ))}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </ListState>

      {!!data?.total && (
        <Pagination
          totalItems={data.total}
          page={page}
          pageSize={pageSize}
          pageSizes={[25, 50, 100]}
          onChange={({ page: p, pageSize: ps }) => {
            setPage(ps === pageSize ? p : 1);
            setPageSize(ps);
          }}
        />
      )}
      <ConfirmActionModal
        open={confirmBulkAbsent}
        title="Mark unmarked staff as absent"
        description={`This will mark all ${totals?.unmarked ?? 0} currently unmarked ${noun(totals?.unmarked ?? 0)} as absent. Existing attendance marks will not change.`}
        confirmLabel="Mark as absent"
        danger
        pending={markUnmarked.isPending}
        onClose={() => setConfirmBulkAbsent(false)}
        onConfirm={() => { onMarkUnmarked(); setConfirmBulkAbsent(false); }}
      />
    </div>
  );
}
