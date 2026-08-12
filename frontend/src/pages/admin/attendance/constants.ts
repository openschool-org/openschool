import type { AttendanceRecordRow } from "../../../services/attendance";

export type Status = "present" | "absent" | "late" | "excused" | null;

export const STATUS_STYLES: Record<
  NonNullable<Status>,
  { bg: string; border: string; color: string; label: string }
> = {
  present: { bg: "#defbe6", border: "#24a148", color: "#0e6027", label: "Present" },
  absent: { bg: "#fff1f1", border: "#da1e28", color: "#a2191f", label: "Absent" },
  late: { bg: "#fdf6dd", border: "#f1c21b", color: "#7d5a00", label: "Late" },
  excused: { bg: "#f6f2ff", border: "#8a3ffc", color: "#6929c4", label: "Excused" },
};

export function recordsToState(records: AttendanceRecordRow[]) {
  const statuses: Record<string, Status> = {};
  const notes: Record<string, string> = {};
  for (const r of records) {
    if (r.status === "present" || r.status === "absent" || r.status === "late" || r.status === "excused") {
      statuses[r.student_id] = r.status;
    }
    if (r.note) notes[r.student_id] = r.note;
  }
  return { statuses, notes };
}
