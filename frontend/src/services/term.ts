import api from "../lib/api";

// Matches db.Term JSON shape returned by the backend
export interface Term {
  id: string;
  academic_year_id: string;
  name: string;
  start_date: string | null;
  end_date: string | null;
  is_current: boolean;
  sort_order: number;
  created_at: string | null;
}

// Matches models.CreateTermRequest
export interface CreateTermRequest {
  academic_year_id: string;
  name: string;
  start_date: string; // RFC3339 timestamp
  end_date: string; // RFC3339 timestamp
  sort_order?: number;
}

export interface UpdateTermRequest {
  name: string;
  start_date: string;
  end_date: string;
  sort_order?: number;
}

export const termApi = {
  listByAcademicYear: (academicYearId: string) =>
    api
      .get<Term[]>("/terms", { params: { academic_year_id: academicYearId } })
      .then((r) => r.data),

  create: (data: CreateTermRequest) =>
    api.post<Term>("/terms", data).then((r) => r.data),

  update: (id: string, data: UpdateTermRequest) =>
    api.put<Term>(`/terms/${id}`, data).then((r) => r.data),

  setCurrent: (id: string) =>
    api.put(`/terms/${id}/set-current`).then((r) => r.data),

  remove: (id: string) => api.delete(`/terms/${id}`).then((r) => r.data),
};
