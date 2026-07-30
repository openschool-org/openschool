import api from "../lib/api";

export type PrefectRank = "junior" | "senior" | "deputy_head" | "head";

export interface Prefect {
  id: string;
  academic_year_id: string;
  student_id: string;
  rank: PrefectRank;
  created_at: string;
  student_name: string;
  student_index: string;
  grade_name: string | null;
}

export interface AssignPrefectRequest {
  academic_year_id: string;
  student_id: string;
  rank: PrefectRank;
}

export const prefectApi = {
  listByYear: (academicYearId: string) =>
    api.get<Prefect[]>("/prefects", { params: { academic_year_id: academicYearId } }).then((r) => r.data),

  assign: (data: AssignPrefectRequest) =>
    api.put<Prefect>("/prefects", data).then((r) => r.data),

  remove: (id: string) => api.delete(`/prefects/${id}`).then((r) => r.data),
};
