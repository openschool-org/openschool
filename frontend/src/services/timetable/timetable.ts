import api from "../../lib/api";

export type TimetableStatus = "draft" | "under_review" | "approved" | "published" | "rejected" | "archived";

export interface Timetable {
  id: string;
  academic_year_id: string;
  class_id: string;
  version: number;
  status: TimetableStatus;
  parent_timetable_id: string | null;
  created_by: string;
  submitted_at: string | null;
  submitted_by: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  review_comments: string | null;
  published_at: string | null;
  published_by: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface TimetableWithClass extends Timetable {
  class_name: string;
  grade_name: string;
}

export interface TimetableEntry {
  id: string;
  timetable_id: string;
  day_of_week: number;
  period_number: number;
  subject_id: string | null;
  subject_name: string | null;
  teacher_id: string | null;
  teacher_name: string | null;
  classroom_id: string | null;
  classroom_name: string | null;
}

export interface TimetableEntryInput {
  day_of_week: number;
  period_number: number;
  subject_id?: string | null;
  teacher_id?: string | null;
  classroom_id?: string | null;
}

export interface ValidationIssue {
  severity: "error" | "warning";
  message: string;
  day_of_week?: number;
  period_number?: number;
}

export interface ValidationResult {
  valid: boolean;
  issues: ValidationIssue[];
}

export interface StatusHistoryEntry {
  id: string;
  timetable_id: string;
  from_status: string | null;
  to_status: string;
  changed_by: string;
  changed_by_name: string;
  comment: string | null;
  changed_at: string;
}

export interface TeacherScheduleEntry {
  day_of_week: number;
  period_number: number;
  subject_id: string | null;
  subject_name: string | null;
  classroom_id: string | null;
  classroom_name: string | null;
  class_id: string;
  class_name: string;
  grade_name: string;
}

export interface PublishedTimetableResponse {
  timetable: Timetable;
  entries: TimetableEntry[];
}

export const timetableApi = {
  create: (data: { academic_year_id: string; class_id: string }) =>
    api.post<Timetable>("/timetables", data).then((r) => r.data),

  copyFrom: (data: { academic_year_id: string; class_id: string; source_timetable_id: string }) =>
    api.post<Timetable>("/timetables/copy", data).then((r) => r.data),

  revise: (publishedId: string) =>
    api.post<Timetable>(`/timetables/${publishedId}/revise`).then((r) => r.data),

  get: (id: string) => api.get<Timetable>(`/timetables/${id}`).then((r) => r.data),

  listByClass: (classId: string, academicYearId: string) =>
    api
      .get<TimetableWithClass[]>("/timetables", { params: { class_id: classId, academic_year_id: academicYearId } })
      .then((r) => r.data),

  listByYear: (academicYearId: string) =>
    api
      .get<TimetableWithClass[]>("/timetables/by-year", { params: { academic_year_id: academicYearId } })
      .then((r) => r.data),

  // Same listing for the current academic year, via the signed-in
  // Principal/Vice Principal's own scoped endpoint (403 for any other rank).
  listForLeadership: () =>
    api.get<TimetableWithClass[]>("/me/teacher/timetables").then((r) => r.data),

  remove: (id: string) => api.delete(`/timetables/${id}`).then((r) => r.data),

  archive: (id: string) => api.post<Timetable>(`/timetables/${id}/archive`).then((r) => r.data),

  getEntries: (id: string) => api.get<TimetableEntry[]>(`/timetables/${id}/entries`).then((r) => r.data),

  saveEntries: (id: string, entries: TimetableEntryInput[]) =>
    api.put<TimetableEntry[]>(`/timetables/${id}/entries`, { entries }).then((r) => r.data),

  deleteEntry: (id: string, day: number, period: number) =>
    api.delete(`/timetables/${id}/entries/${day}/${period}`).then((r) => r.data),

  validate: (id: string) => api.get<ValidationResult>(`/timetables/${id}/validate`).then((r) => r.data),

  statusHistory: (id: string) =>
    api.get<StatusHistoryEntry[]>(`/timetables/${id}/status-history`).then((r) => r.data),

  submit: (id: string) => api.post<Timetable>(`/timetables/${id}/submit`).then((r) => r.data),

  publish: (id: string) => api.post<Timetable>(`/timetables/${id}/publish`).then((r) => r.data),

  approve: (id: string, comment?: string) =>
    api.post<Timetable>(`/timetables/${id}/approve`, { comment: comment ?? "" }).then((r) => r.data),

  reject: (id: string, comment: string) =>
    api.post<Timetable>(`/timetables/${id}/reject`, { comment }).then((r) => r.data),

  reviewQueue: (academicYearId: string) =>
    api
      .get<TimetableWithClass[]>("/t/timetable/reviews", { params: { academic_year_id: academicYearId } })
      .then((r) => r.data),

  myTeacherSchedule: (academicYearId: string) =>
    api
      .get<TeacherScheduleEntry[]>("/t/timetable", { params: { academic_year_id: academicYearId } })
      .then((r) => r.data),

  myClassTimetable: () =>
    api.get<PublishedTimetableResponse>("/timetable/my-class").then((r) => r.data),

  publishedForClass: (classId: string, academicYearId: string) =>
    api
      .get<PublishedTimetableResponse>("/timetables/published", {
        params: { class_id: classId, academic_year_id: academicYearId },
      })
      .then((r) => r.data),

  childTimetable: (studentId: string) =>
    api.get<PublishedTimetableResponse>(`/me/children/${studentId}/timetable`).then((r) => r.data),
};
