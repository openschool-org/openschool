import { useState } from "react";
import { Button, ComposedModal, InlineNotification, ModalBody, ModalFooter, ModalHeader, SkeletonText, TextArea } from "@carbon/react";
import InfoRow from "@/shared/ui/InfoRow";
import { getErrorMessage } from "@/shared/api/errors";
import { useToast } from "@/shared/ui/toast/useToast";
import { formatDate, formatDateTime } from "@/shared/lib/date";
import { LEAVE_TYPE_LABELS } from "@/features/leave/constants";
import { useDecideLeave, useLeaveDetail } from "@/features/leave/queries/useLeave";
import LeaveStatusTag from "@/features/leave/components/LeaveStatusTag";
import { leaveDates, leaveDays } from "@/features/leave/components/leaveText";

interface Props {
  id: string;
  onClose: () => void;
}

// The approver's view of one application: the request, its relief plan, and the decision.
export default function LeaveReviewModal({ id, onClose }: Props) {
  const { data: leave, isLoading } = useLeaveDetail(id);
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
    <ComposedModal open size="md" onClose={onClose} aria-label="Leave application">
      <ModalHeader title={leave ? `${leave.teacher_name}: ${LEAVE_TYPE_LABELS[leave.leave_type]}` : "Leave application"} />
      <ModalBody>
        {isLoading || !leave ? (
          <SkeletonText paragraph lineCount={4} />
        ) : (
          <div className="os-flex os-col os-gap-4">
            {decide.isError && (
              <InlineNotification kind="error" lowContrast hideCloseButton className="os-max-w-full" title="Could not save the decision" subtitle={getErrorMessage(decide.error, "Please try again.")} />
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
              <h3 className="os-text-md os-fw-600 os-mb-2">Relief arrangements</h3>
              {leave.relief.length === 0 ? (
                <p className="os-text-sm os-c-secondary">No timetabled periods are missed.</p>
              ) : (
                <table className="os-table">
                  <thead><tr><th>Date</th><th>Period</th><th>Class</th><th>Subject</th><th>Relief teacher</th></tr></thead>
                  <tbody>
                    {leave.relief.map((r) => (
                      <tr key={r.id} className={r.relief_teacher_id ? undefined : "is-warning"}>
                        <td className="os-table__mono">{formatDate(r.date)}</td>
                        <td>{r.period_number}</td>
                        <td>{r.class_name}</td>
                        <td className="os-table__muted">{r.subject_name || "-"}</td>
                        <td>{r.relief_teacher_name || "Not arranged"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
              {uncovered > 0 && leave.status === "pending" && (
                <p className="os-text-sm os-c-warning-text os-mt-2">{uncovered} period{uncovered === 1 ? "" : "s"} still need a relief teacher.</p>
              )}
            </div>
            {leave.status === "pending" && (
              <TextArea
                id="leave-decision-note"
                labelText={rejecting ? "Reason for not approving" : "Note to the teacher (optional)"}
                rows={2}
                maxCount={1000}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                invalid={rejecting && !note.trim()}
                invalidText="Give a reason when not approving"
              />
            )}
          </div>
        )}
      </ModalBody>
      <ModalFooter>
        <Button kind="secondary" onClick={onClose}>Close</Button>
        {leave?.status === "pending" && (
          <>
            <Button kind="danger" onClick={() => submit(false)} disabled={decide.isPending}>Not approve</Button>
            <Button kind="primary" onClick={() => submit(true)} disabled={decide.isPending}>{decide.isPending ? "Saving…" : "Approve"}</Button>
          </>
        )}
      </ModalFooter>
    </ComposedModal>
  );
}
