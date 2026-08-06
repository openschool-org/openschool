import api from "../lib/api";

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

  monthlySummary: (year: number, month: number) =>
    api
      .get<StaffAttendanceByGroup<StaffAttendanceSummaryRow>>("/staff-attendance/monthly-summary", {
        params: { year, month },
      })
      .then((r) => r.data),

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
};
