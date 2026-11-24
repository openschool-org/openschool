import type { LeaveStatus } from "@/features/leave/api/leave";
import { LEAVE_STATUS_TAGS } from "@/features/leave/constants";

// Leave status in the same solid pill as attendance: approved green, waiting orange, not approved red, cancelled gray.
export default function LeaveStatusTag({ status }: { status: LeaveStatus }) {
  return <span className={`os-att-badge is-leave-${status}`}>{LEAVE_STATUS_TAGS[status].label}</span>;
}
