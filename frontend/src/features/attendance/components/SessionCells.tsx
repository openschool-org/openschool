import { Button } from "antd";
import SessionStateBadge from "@/features/attendance/components/SessionStateBadge";
import LinkButton from "@/shared/ui/LinkButton";
import type { DailySession } from "@/features/attendance/api/attendance";
import { isLockedAfter24Hours } from "@/shared/lib/date";

export function SessionStatus({ session }: { session: DailySession }) {
  const isMarked = session.marked_count > 0;
  return (
    <div className="os-flex os-gap-1h os-wrap">
      <SessionStateBadge state={isMarked ? "marked" : "pending"} />
      {isLockedAfter24Hours(session.created_at) && <SessionStateBadge state="locked" />}
    </div>
  );
}

// A marked session, or one locked after 24 hours for a non-admin, opens read-only.
export function SessionActions({ session, isAdmin, onDelete, canMark = true }: { session: DailySession; isAdmin: boolean; onDelete: (s: DailySession) => void; canMark?: boolean }) {
  const readOnly = !canMark || session.marked_count > 0 || (isLockedAfter24Hours(session.created_at) && !isAdmin);
  return (
    <div className="os-grid__actions os-nowrap-flex">
      <LinkButton to={`/attendance/sessions/${session.id}/mark`} type={readOnly ? "link" : "primary"} size="small">
        {readOnly ? "View" : "Mark"}
      </LinkButton>
      <Button type="text" danger size="small" onClick={() => onDelete(session)}>Delete</Button>
    </div>
  );
}
