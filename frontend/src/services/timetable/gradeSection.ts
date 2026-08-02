import api from "../../lib/api";

export interface GradeSection {
  id: string;
  academic_year_id: string;
  name: string;
  interval_start_time: string;
  interval_end_time: string;
  section_head_teacher_id: string | null;
  section_head_name: string | null;
  sort_order: number;
  grade_ids: string[];
}

export interface CreateGradeSectionRequest {
  academic_year_id: string;
  name: string;
  interval_start_time: string;
  interval_end_time: string;
  section_head_teacher_id?: string | null;
  sort_order: number;
  grade_ids?: string[];
}

export interface UpdateGradeSectionRequest {
  name: string;
  interval_start_time: string;
  interval_end_time: string;
  section_head_teacher_id?: string | null;
  sort_order: number;
}

export interface TimetablePeriod {
  id: string;
  sort_order: number;
  period_number: number | null;
  start_time: string;
  end_time: string;
  slot_type: "period" | "interval";
}

export const gradeSectionApi = {
  listByYear: (academicYearId: string) =>
    api
      .get<GradeSection[]>("/grade-sections", { params: { academic_year_id: academicYearId } })
      .then((r) => r.data),

  get: (id: string) => api.get<GradeSection>(`/grade-sections/${id}`).then((r) => r.data),

  create: (data: CreateGradeSectionRequest) =>
    api.post<GradeSection>("/grade-sections", data).then((r) => r.data),

  update: (id: string, data: UpdateGradeSectionRequest) =>
    api.put<GradeSection>(`/grade-sections/${id}`, data).then((r) => r.data),

  remove: (id: string) => api.delete(`/grade-sections/${id}`).then((r) => r.data),

  assignGrades: (id: string, gradeIds: string[]) =>
    api.put<GradeSection>(`/grade-sections/${id}/grades`, { grade_ids: gradeIds }).then((r) => r.data),

  removeGrade: (id: string, gradeId: string) =>
    api.delete(`/grade-sections/${id}/grades/${gradeId}`).then((r) => r.data),

  getPeriods: (id: string) =>
    api.get<TimetablePeriod[]>(`/grade-sections/${id}/periods`).then((r) => r.data),

  savePeriods: (id: string, periods: Omit<TimetablePeriod, "id">[]) =>
    api.put<TimetablePeriod[]>(`/grade-sections/${id}/periods`, { periods }).then((r) => r.data),

  regeneratePeriods: (id: string) =>
    api.post<TimetablePeriod[]>(`/grade-sections/${id}/periods/generate`).then((r) => r.data),
};
