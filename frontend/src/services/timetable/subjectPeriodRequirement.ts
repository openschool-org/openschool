import api from "../../lib/api";

export interface SubjectPeriodRequirement {
  id: string;
  academic_year_id: string;
  grade_id: string;
  subject_id: string;
  periods_per_week: number;
  // how many of periods_per_week must be in a matching lab classroom.
  lab_periods_per_week: number;
  // how many back-to-back 2-period blocks to carve out of periods_per_week
  // (e.g. AL subjects commonly run some periods as doubles) — not
  // all-or-nothing: the rest of periods_per_week is still scheduled singly.
  double_period_blocks: number;
  created_at: string | null;
  subject_name: string;
  subject_code: string;
}

export interface UpsertSubjectPeriodRequirementRequest {
  academic_year_id: string;
  grade_id: string;
  subject_id: string;
  periods_per_week: number;
  lab_periods_per_week?: number;
  double_period_blocks?: number;
}

export const subjectPeriodRequirementApi = {
  listByGrade: (academicYearId: string, gradeId: string) =>
    api
      .get<SubjectPeriodRequirement[]>("/subject-period-requirements", {
        params: { academic_year_id: academicYearId, grade_id: gradeId },
      })
      .then((r) => r.data),

  upsert: (data: UpsertSubjectPeriodRequirementRequest) =>
    api.put<SubjectPeriodRequirement>("/subject-period-requirements", data).then((r) => r.data),

  remove: (id: string) => api.delete(`/subject-period-requirements/${id}`).then((r) => r.data),
};
