import { useState } from "react";
import { Alert, Button, Modal, Skeleton } from "antd";
import TextAreaField from "@/shared/ui/TextAreaField";
import { MODAL_WIDTH } from "@/shared/ui/modalWidth";
import { getErrorMessage } from "@/shared/api/errors";
import { useToast } from "@/shared/ui/toast/useToast";
import { LEAVE_TYPE_LABELS } from "@/features/leave/constants";
import { useDecideLeave, useLeaveDetail } from "@/features/leave/queries/useLeave";
import { useMyTeacherProfile } from "@/features/teachers/queries/useTeachers";
import { useRole } from "@/shared/auth/useRole";
import LeaveReviewDetails from "@/features/leave/components/LeaveReviewDetails";

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
  const canDecide = leave?.status === "pending" && canDecideOwnRequest;

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
          {canDecide && (
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
            <LeaveReviewDetails leave={leave} />
            {canDecide && (
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
