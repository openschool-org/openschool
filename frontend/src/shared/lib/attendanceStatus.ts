// antd Tag colour per attendance status, for read-only history views and roster totals
// (student's own attendance, a parent's view of a child's attendance, staff totals).
export const ATTENDANCE_STATUS_COLOR: Record<string, string | undefined> = {
  present: "success",
  absent: "error",
  late: "warning",
  excused: "blue",
  leave: "blue",
};
