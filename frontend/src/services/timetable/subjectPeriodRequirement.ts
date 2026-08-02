import api from "../../lib/api";

export interface SubjectPeriodRequirement {
  id: string;
  academic_year_id: string;
  grade_id: string;
  subject_id: string;
  periods_per_week: number;
  created_at: string | null;
  subject_name: string;
  subject_code: string;
}

export interface UpsertSubjectPeriodRequirementRequest {
  academic_year_id: string;
  grade_id: string;
  subject_id: string;
  periods_per_week: number;
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
