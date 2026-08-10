import api from "../lib/api";

export type PrefectRank =
  | "junior"
  | "senior"
  | "deputy_head"
  | "head"
  | "house_captain"
  | "vice_house_captain";

// Matches db.ListPrefectYearsRow — academic years that have at least one
// prefect appointment, for the archive view's year selector.
export interface PrefectYear {
  id: string;
  label: string;
  start_date: string;
}

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

  listYears: () => api.get<PrefectYear[]>("/prefects/years").then((r) => r.data),
};
