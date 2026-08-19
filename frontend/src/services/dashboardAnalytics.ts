// This file defines the TypeScript types and API call for the school-wide
// dashboard/analytics aggregate endpoint (student, staff, academic, school).

import api from "../lib/api";

export interface CountRow {
  label: string;
  count: number;
}

export interface HouseCountRow {
  name: string;
  color: string;
  count: number;
}

export interface AttendanceTrendPoint {
  date: string;
  present_count: number;
  total_count: number;
}

export interface PerformanceRow {
  label: string;
  average_percentage: number;
  entries: number;
}

export interface GrowthPoint {
  label: string;
  count: number;
}

export interface StaffAttendanceTotals {
  present_count: number;
  late_count: number;
  absent_count: number;
  leave_count: number;
}

export interface DashboardAnalytics {
  student: {
    total: number;
    by_grade: CountRow[];
    by_class: CountRow[];
    gender_distribution: CountRow[];
    house_distribution: HouseCountRow[];
    attendance_trend: AttendanceTrendPoint[];
  };
  staff: {
    academic_staff_count: number;
    non_academic_staff_count: number;
    attendance_this_month: StaffAttendanceTotals;
  };
  academic: {
    subject_performance: PerformanceRow[];
    examination_average: number;
    examination_entries: number;
    students_with_marks: number;
    grade_wise_performance: PerformanceRow[];
    class_wise_performance: PerformanceRow[];
    attendance_percentage: number;
  };
  school: {
    student_growth: GrowthPoint[];
    staff_growth: GrowthPoint[];
    notifications_sent_count: number;
    timetable_completion_pct: number;
    total_classes: number;
    published_classes: number;
  };
}

export const dashboardAnalyticsApi = {
  get: () => api.get<DashboardAnalytics>("/dashboard/analytics").then((r) => r.data),

  // Same shape, scoped to the signed-in Principal/Vice Principal — see
  // TeacherSelfHandler.Analytics on the backend.
  getForLeadership: () =>
    api.get<DashboardAnalytics>("/me/teacher/analytics").then((r) => r.data),
};
