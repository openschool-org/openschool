// Shared by the full Timetable Review page and the Section Head's dashboard
// panel, one row of the review queue with inline Approve/Reject actions.

import { useState } from "react";
import { Link } from "react-router";
import { Button, Tag, TextArea, ComposedModal, ModalHeader, ModalBody, ModalFooter } from "@carbon/react";
import { formatDateTime } from "@/shared/lib/date";
import { useApproveTimetable, useRejectTimetable } from "@/features/timetable/queries/useTimetables";
import type { TimetableWithClass } from "@/features/timetable/api/timetable";
import MutationErrorNotification from "@/shared/ui/MutationErrorNotification";
import { classLabel } from "@/shared/lib/classLabel";

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
    <div className="os-list-row os-gap-4 os-py-3h os-px-6">
      <div className="os-flex-1">
        <p className="os-m-0 os-fw-500 os-text-md">
          {classLabel(timetable.grade_name, timetable.class_name)}{" "}
          <Tag type="gray" size="sm">
            v{timetable.version}
          </Tag>
        </p>
        <p className="os-m-0 os-text-xs os-c-tertiary">
          Submitted {formatDateTime(timetable.submitted_at)}
        </p>
        <MutationErrorNotification
          isError={approve.isError || reject.isError}
          error={approve.error ?? reject.error}
          title="Action failed" className="os-max-w-28 os-mt-2"
        />
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

      <ComposedModal open={rejecting} size="sm" onClose={() => setRejecting(false)} aria-label={`Reject ${classLabel(timetable.grade_name, timetable.class_name)}`}>
        <ModalHeader title={`Reject ${classLabel(timetable.grade_name, timetable.class_name)}`} />
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
