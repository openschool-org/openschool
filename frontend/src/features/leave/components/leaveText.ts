import type { LeaveRequest } from "@/features/leave/api/leave";
import { formatDayMonthYear } from "@/shared/lib/date";
import { formatTimeRange } from "@/shared/lib/timetable";

// "12 Oct 2026 to 16 Oct 2026", "12 Oct 2026 afternoon" or "12 Oct 2026, 12.00-01.30 p.m.".
export function leaveDates(r: Pick<LeaveRequest, "leave_type" | "start_date" | "end_date" | "day_part" | "start_time" | "end_time">): string {
  if (r.leave_type === "short") return `${formatDayMonthYear(r.start_date)}, ${formatTimeRange(r.start_time ?? "", r.end_time ?? "")}`;
  if (r.day_part !== "full") return `${formatDayMonthYear(r.start_date)} ${r.day_part}`;
  if (r.start_date === r.end_date) return formatDayMonthYear(r.start_date);
  return `${formatDayMonthYear(r.start_date)} to ${formatDayMonthYear(r.end_date)}`;
}

// Short leave is counted per month, not in days.
export function leaveDays(r: Pick<LeaveRequest, "leave_type" | "days">): string {
  if (r.leave_type === "short") return "Short";
  return r.days === 1 ? "1 day" : `${r.days} days`;
}
