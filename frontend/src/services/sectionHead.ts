import api from "../lib/api";

export interface SectionHead {
  id: string;
  academic_year_id: string;
  grade_id: string;
  stream_id: string | null;
  teacher_id: string;
  created_at: string;
  grade_name: string;
  stream_name: string | null;
  teacher_name: string;
}

export interface AssignSectionHeadRequest {
  academic_year_id: string;
  grade_id: string;
  stream_id?: string | null;
  teacher_id: string;
}

export const sectionHeadApi = {
  listByYear: (academicYearId: string) =>
    api
      .get<SectionHead[]>("/section-heads", { params: { academic_year_id: academicYearId } })
      .then((r) => r.data),

  assign: (data: AssignSectionHeadRequest) =>
    api.put<SectionHead>("/section-heads", data).then((r) => r.data),

  remove: (id: string) => api.delete(`/section-heads/${id}`).then((r) => r.data),
};
