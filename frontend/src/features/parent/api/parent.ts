import api from "@/shared/api/client";
import type { MarkHistoryYear } from "@/features/marks/api/termMark";

// Matches db.ListStudentsByGuardianUserIDRow
export interface Child {
  id: string;
  full_name: string;
  name_with_initials: string;
  index_number: string;
  gender: string | null;
  class_id: string | null;
  class_name: string | null;
  grade_name: string | null;
}

// Matches db.ListAttendanceByStudentRow
export interface ChildAttendanceRecord {
  id: string;
  session_id: string;
  status: "present" | "absent" | "late" | "excused";
  note: string | null;
  session_date: string;
  class_name: string;
}

// Matches db.GetGuardianChildrenSummaryRow: one row per child, this month and the latest term.
export interface ChildSummary {
  student_id: string;
  sessions_this_month: number;
  attended_this_month: number;
  latest_term_name: string;
  latest_average_percent: number;
  has_marks: boolean;
}

export const parentApi = {
  listChildren: () => api.get<Child[]>("/me/children").then((r) => r.data),

  childrenSummary: () => api.get<ChildSummary[]>("/me/children/summary").then((r) => r.data),

  childAttendance: (studentId: string) =>
    api
      .get<ChildAttendanceRecord[]>(`/me/children/${studentId}/attendance`)
      .then((r) => r.data),


  childMarkHistory: (studentId: string) =>
    api.get<MarkHistoryYear[]>(`/me/children/${studentId}/marks/history`).then((r) => r.data),
};
