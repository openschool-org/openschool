export interface StatusStyle {
  bg: string;
  border: string;
  color: string;
  label: string;
}

type Tone = "present" | "absent" | "late" | "excused";

const tone = (t: Tone, label: string): StatusStyle => ({
  bg: `var(--os-status-${t}-bg)`,
  border: `var(--os-status-${t}-border)`,
  color: `var(--os-status-${t}-text)`,
  label,
});

export type StudentAttendanceStatus = "present" | "absent" | "late" | "excused";
export type StaffAttendanceStatusKey = "present" | "absent" | "late" | "leave";

export const STUDENT_ATTENDANCE_STYLES: Record<StudentAttendanceStatus, StatusStyle> = {
  present: tone("present", "Present"),
  absent: tone("absent", "Absent"),
  late: tone("late", "Late"),
  excused: tone("excused", "Excused"),
};

// Staff "leave" reuses the excused palette.
export const STAFF_ATTENDANCE_STYLES: Record<StaffAttendanceStatusKey, StatusStyle> = {
  present: tone("present", "Present"),
  absent: tone("absent", "Absent"),
  late: tone("late", "Late"),
  leave: tone("excused", "Leave"),
};

export const STAFF_STATUSES = ["present", "late", "absent", "leave"] as const;
