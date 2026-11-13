// Shared by the full Timetable Review page and the Section Head's dashboard
// panel, one row of the review queue with inline Approve/Reject actions.

import { useState } from "react";
import { Link } from "react-router";
import { Button, Tag } from "antd";
import { formatDateTime } from "@/shared/lib/date";
import { useApproveTimetable, useRejectTimetable } from "@/features/timetable/queries/useTimetables";
import type { TimetableWithClass } from "@/features/timetable/api/timetable";
import MutationErrorNotification from "@/shared/ui/MutationErrorNotification";
import FormModal from "@/shared/ui/FormModal";
import TextAreaField from "@/shared/ui/TextAreaField";
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
          <Tag variant="filled">
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
      <Link to={`/timetables/${timetable.id}`}><Button size="small" type="text">View</Button></Link>
      <Button size="small" danger onClick={() => setRejecting(true)} loading={reject.isPending}>
        Reject
      </Button>
      <Button type="primary" size="small" onClick={() => approve.mutate(undefined)} loading={approve.isPending}>
        {approve.isPending ? "Approving…" : "Approve"}
      </Button>

      <FormModal
        open={rejecting}
        title={`Reject ${classLabel(timetable.grade_name, timetable.class_name)}`}
        onClose={() => setRejecting(false)}
        onSubmit={handleReject}
        isPending={reject.isPending}
        submitDisabled={!comment.trim()}
        submitLabel="Reject"
        pendingLabel="Rejecting…"
      >
        <TextAreaField
          id={`reject-comment-${timetable.id}`}
          label="Reason (required)"
          placeholder="e.g. Science teacher is double-booked on Monday Period 3"
          value={comment}
          onChange={setComment}
          rows={4}
        />
      </FormModal>
    </div>
  );
}
