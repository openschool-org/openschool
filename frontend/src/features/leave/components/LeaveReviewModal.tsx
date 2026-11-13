import { useState } from "react";
import { Alert, Button, Modal, Skeleton } from "antd";
import DataGrid from "@/shared/ui/DataGrid";
import TextAreaField from "@/shared/ui/TextAreaField";
import { MODAL_WIDTH } from "@/shared/ui/modalWidth";
import InfoRow from "@/shared/ui/InfoRow";
import { getErrorMessage } from "@/shared/api/errors";
import { useToast } from "@/shared/ui/toast/useToast";
import { formatDate, formatDateTime } from "@/shared/lib/date";
import { LEAVE_TYPE_LABELS } from "@/features/leave/constants";
import { useDecideLeave, useLeaveDetail } from "@/features/leave/queries/useLeave";
import LeaveStatusTag from "@/features/leave/components/LeaveStatusTag";
import { leaveDates, leaveDays } from "@/features/leave/components/leaveText";
import { useMyTeacherProfile } from "@/features/teachers/queries/useTeachers";
import { useRole } from "@/shared/auth/useRole";

interface Props {
  id: string;
  onClose: () => void;
}

// The approver's view of one application: the request, its relief plan, and the decision.
export default function LeaveReviewModal({ id, onClose }: Props) {
  const { data: leave, isLoading } = useLeaveDetail(id);
  const { data: teacher } = useMyTeacherProfile();
  const { role } = useRole();
  const canDecideOwnRequest = role === "admin" || teacher?.id !== leave?.teacher_id;
  const decide = useDecideLeave();
  const { showToast } = useToast();
  const [note, setNote] = useState("");
  const [rejecting, setRejecting] = useState(false);
  const uncovered = (leave?.relief ?? []).filter((r) => !r.relief_teacher_id).length;

  const submit = (approve: boolean) => {
    if (!approve && !note.trim()) {
      setRejecting(true);
      return;
    }
    decide.mutate(
      { id, approve, note: note.trim() },
      {
        onSuccess: () => {
          showToast({ kind: approve ? "success" : "info", title: approve ? "Leave approved" : "Leave not approved", subtitle: "The teacher has been told." });
          onClose();
        },
      },
    );
  };

  return (
    <Modal
      open
      width={MODAL_WIDTH.md}
      onCancel={onClose}
      title={leave ? `${leave.teacher_name}: ${LEAVE_TYPE_LABELS[leave.leave_type]}` : "Leave application"}
      footer={
        <>
          <Button onClick={onClose}>Close</Button>
          {leave?.status === "pending" && canDecideOwnRequest && (
            <>
              <Button danger onClick={() => submit(false)} disabled={decide.isPending}>Not approve</Button>
              <Button type="primary" onClick={() => submit(true)} loading={decide.isPending}>{decide.isPending ? "Saving…" : "Approve"}</Button>
            </>
          )}
        </>
      }
    >
        {isLoading || !leave ? (
          <Skeleton active title={false} paragraph={{ rows: 4 }} />
        ) : (
          <div className="os-flex os-col os-gap-4">
            {decide.isError && (
              <Alert type="error" showIcon title="Could not save the decision" description={getErrorMessage(decide.error, "Please try again.")} />
            )}
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
            {leave.status === "pending" && canDecideOwnRequest && (
              <TextAreaField
                id="leave-decision-note"
                label={rejecting ? "Reason for not approving" : "Note to the teacher (optional)"}
                rows={2}
                maxLength={1000}
                value={note}
                onChange={setNote}
                invalid={rejecting && !note.trim()}
                invalidText="Give a reason when not approving"
              />
            )}
          </div>
        )}
    </Modal>
  );
}
