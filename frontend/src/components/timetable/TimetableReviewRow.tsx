// Shared by the full Timetable Review page and the Section Head's dashboard
// panel — one row of the review queue with inline Approve/Reject actions.

import { useState } from "react";
import { Link } from "react-router";
import { Button, Tag, TextArea, InlineNotification, ComposedModal, ModalHeader, ModalBody, ModalFooter } from "@carbon/react";
import { useApproveTimetable, useRejectTimetable } from "../../queries/timetable/useTimetables";
import type { TimetableWithClass } from "../../services/timetable/timetable";
import { getErrorMessage } from "../../lib/errorMessage";

export default function TimetableReviewRow({ timetable }: { timetable: TimetableWithClass }) {
  const approve = useApproveTimetable(timetable.id);
  const reject = useRejectTimetable(timetable.id);
  const [rejecting, setRejecting] = useState(false);
  const [comment, setComment] = useState("");

  const handleReject = () => {
    if (!comment.trim()) return;
    reject.mutate(comment.trim(), { onSuccess: () => setRejecting(false) });
  };

  return (
    <div style={{ display: "flex", alignItems: "center", gap: "1rem", padding: "0.875rem 1.5rem", borderBottom: "1px solid #f4f4f4" }}>
      <div style={{ flex: 1 }}>
        <p style={{ margin: 0, fontWeight: 500, fontSize: "0.875rem" }}>
          {timetable.grade_name} - {timetable.class_name}{" "}
          <Tag type="gray" size="sm">
            v{timetable.version}
          </Tag>
        </p>
        <p style={{ margin: 0, fontSize: "0.75rem", color: "#8d8d8d" }}>
          Submitted {timetable.submitted_at ? new Date(timetable.submitted_at).toLocaleString() : ""}
        </p>
        {(approve.isError || reject.isError) && (
          <InlineNotification
            kind="error"
            title="Action failed"
            subtitle={getErrorMessage(approve.error ?? reject.error)}
            lowContrast
            hideCloseButton
            style={{ maxWidth: "28rem", marginTop: "0.5rem" }}
          />
        )}
      </div>
      <Button kind="ghost" size="sm" as={Link} to={`/timetables/${timetable.id}`}>
        View
      </Button>
      <Button kind="danger--tertiary" size="sm" onClick={() => setRejecting(true)} disabled={reject.isPending}>
        Reject
      </Button>
      <Button kind="primary" size="sm" onClick={() => approve.mutate(undefined)} disabled={approve.isPending}>
        {approve.isPending ? "Approving…" : "Approve"}
      </Button>

      <ComposedModal open={rejecting} size="sm" onClose={() => setRejecting(false)}>
        <ModalHeader title={`Reject ${timetable.grade_name} - ${timetable.class_name}`} />
        <ModalBody>
          <TextArea
            id={`reject-comment-${timetable.id}`}
            labelText="Reason (required)"
            placeholder="e.g. Science teacher is double-booked on Monday Period 3"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={4}
          />
        </ModalBody>
        <ModalFooter>
          <Button kind="secondary" onClick={() => setRejecting(false)}>
            Cancel
          </Button>
          <Button kind="danger" onClick={handleReject} disabled={!comment.trim() || reject.isPending}>
            {reject.isPending ? "Rejecting…" : "Reject"}
          </Button>
        </ModalFooter>
      </ComposedModal>
    </div>
  );
}
