import DataGrid from "@/shared/ui/DataGrid";
import InfoRow from "@/shared/ui/InfoRow";
import { formatDate, formatDateTime } from "@/shared/lib/date";
import type { LeaveRequestDetail } from "@/features/leave/api/leave";
import LeaveStatusTag from "@/features/leave/components/LeaveStatusTag";
import { leaveDates, leaveDays } from "@/features/leave/components/leaveText";

// The request itself and its relief plan, as the approver sees them.
export default function LeaveReviewDetails({ leave }: { leave: LeaveRequestDetail }) {
  const uncovered = leave.relief.filter((r) => !r.relief_teacher_id).length;
  return (
    <>
      <div>
        <InfoRow label="Status" value={<LeaveStatusTag status={leave.status} />} />
        <InfoRow label="Dates" value={`${leaveDates(leave)} (${leaveDays(leave)})`} />
        <InfoRow label="Reason" value={leave.reason} />
        <InfoRow label="Acting teacher" value={leave.acting_teacher_name || "-"} />
        <InfoRow label="Applied" value={formatDateTime(leave.created_at)} />
        {leave.decided_at && <InfoRow label="Decided" value={`${formatDateTime(leave.decided_at)} by ${leave.decided_by_name || "-"}`} />}
        {leave.decision_note && <InfoRow label="Note" value={leave.decision_note} />}
      </div>
      <div>
        <h3 className="os-text-md os-fw-500 os-mb-2">Relief arrangements</h3>
        {leave.relief.length === 0 ? (
          <p className="os-text-sm os-c-secondary">No timetabled periods are missed.</p>
        ) : (
          <DataGrid
            rows={leave.relief}
            getRowId={(r) => r.id}
            pagination={false}
            noHover
            rowClassName={(r) => (r.relief_teacher_id ? "" : "is-warning")}
            columns={[
              { key: "date", header: "Date", render: (r) => <span className="os-table__mono">{formatDate(r.date)}</span> },
              { key: "period", header: "Period", render: (r) => r.period_number },
              { key: "class", header: "Class", render: (r) => r.class_name },
              { key: "subject", header: "Subject", render: (r) => <span className="os-table__muted">{r.subject_name || "-"}</span> },
              { key: "relief", header: "Relief teacher", render: (r) => r.relief_teacher_name || "Not arranged" },
            ]}
          />
        )}
        {uncovered > 0 && leave.status === "pending" && (
          <p className="os-text-sm os-c-warning-text os-mt-2">{uncovered} period{uncovered === 1 ? "" : "s"} still need a relief teacher.</p>
        )}
      </div>
    </>
  );
}
