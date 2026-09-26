import api from "@/shared/api/client";
import type { Page } from "@/shared/api/page";

export type StaffAttendanceStatus = "present" | "late" | "absent" | "leave";

export interface StaffAttendanceRow {
  staff_id: string;
  full_name: string;
  employee_number: string;
  record_id?: string;
  status?: StaffAttendanceStatus;
  note?: string;
}

export interface StaffAttendanceSummaryRow {
  staff_id: string;
  full_name: string;
  present_count: number;
  late_count: number;
  absent_count: number;
  leave_count: number;
}

export interface StaffAttendanceByGroup<T> {
  teachers: T[];
  non_academic_staff: T[];
}

export type StaffKind = "teacher" | "staff";

export interface StaffRosterParams {
  kind: StaffKind;
  search?: string;
  limit: number;
  offset: number;
}

// Counts for the whole filtered roster that day, not just the current page.
export interface StaffStatusTotals {
  present: number;
  late: number;
  absent: number;
  leave: number;
  unmarked: number;
}

export interface StaffRosterPage extends Page<StaffAttendanceRow> {
  totals: StaffStatusTotals;
}

export interface MarkStaffAttendanceRequest {
  teacher_id?: string;
  non_academic_staff_id?: string;
  date: string; // RFC3339 timestamp
  status: StaffAttendanceStatus;
  note?: string;
}

export interface StaffAttendanceRecord {
  id: string;
  teacher_id: string | null;
  non_academic_staff_id: string | null;
  date: string;
  status: StaffAttendanceStatus;
  note: string | null;
}

export const staffAttendanceApi = {
  mark: (data: MarkStaffAttendanceRequest) =>
    api.post<StaffAttendanceRecord>("/staff-attendance", data).then((r) => r.data),

  byDate: (date: string) =>
    api
      .get<StaffAttendanceByGroup<StaffAttendanceRow>>("/staff-attendance", { params: { date } })
      .then((r) => r.data),

  roster: (date: string, params: StaffRosterParams) =>
    api.get<StaffRosterPage>("/staff-attendance/roster", { params: { date, ...params, search: params.search || undefined } }).then((r) => r.data),

  monthly: (year: number, month: number, params: StaffRosterParams) =>
    api
      .get<Page<StaffAttendanceSummaryRow>>("/staff-attendance/monthly", { params: { year, month, ...params, search: params.search || undefined } })
      .then((r) => r.data),

  // Marks everyone of the kind without a record that day as present; existing marks are kept.
  markUnmarked: (date: string, kind: StaffKind) =>
    api.post<{ marked: number }>("/staff-attendance/mark-unmarked", { date: new Date(date).toISOString(), kind }).then((r) => r.data),

  teacherHistory: (teacherId: string, year: number, month: number) =>
    api
      .get<StaffAttendanceRecord[]>(`/staff-attendance/teachers/${teacherId}/history`, {
        params: { year, month },
      })
      .then((r) => r.data),

  nonAcademicStaffHistory: (staffId: string, year: number, month: number) =>
    api
      .get<StaffAttendanceRecord[]>(`/staff-attendance/non-academic-staff/${staffId}/history`, {
        params: { year, month },
      })
      .then((r) => r.data),

  // The signed-in teacher's own attendance history, distinct from
  // teacherHistory above, which requires an admin-only :id lookup.
  myHistory: (year: number, month: number) =>
    api
      .get<StaffAttendanceRecord[]>("/me/teacher/attendance", { params: { year, month } })
      .then((r) => r.data),
};
