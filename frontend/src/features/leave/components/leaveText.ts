import type { LeaveRequest } from "@/features/leave/api/leave";
import { formatDate } from "@/shared/lib/date";

// "12/10/2026 to 16/10/2026", "12/10/2026 afternoon" or "12/10/2026, 12:00-13:30".
export function leaveDates(r: Pick<LeaveRequest, "leave_type" | "start_date" | "end_date" | "day_part" | "start_time" | "end_time">): string {
  if (r.leave_type === "short") return `${formatDate(r.start_date)}, ${r.start_time}-${r.end_time}`;
  if (r.day_part !== "full") return `${formatDate(r.start_date)} ${r.day_part}`;
  if (r.start_date === r.end_date) return formatDate(r.start_date);
  return `${formatDate(r.start_date)} to ${formatDate(r.end_date)}`;
}

// Short leave is counted per month, not in days.
export function leaveDays(r: Pick<LeaveRequest, "leave_type" | "days">): string {
  if (r.leave_type === "short") return "Short";
  return r.days === 1 ? "1 day" : `${r.days} days`;
}
