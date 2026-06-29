import api from "../lib/api";

// Matches db.AcademicYear JSON shape returned by the backend
export interface AcademicYear {
  id: string;
  label: string;
  start_date: string | null;
  end_date: string | null;
  is_current: boolean;
  created_at: string | null;
}

// Matches models.CreateAcademicYearRequest
export interface CreateAcademicYearRequest {
  label: string;
  start_date: string; // RFC3339 timestamp
  end_date: string; // RFC3339 timestamp
  is_current?: boolean;
}

export const academicYearApi = {
  list: () =>
    api.get<AcademicYear[]>("/academic-years").then((r) => r.data),

  getCurrent: () =>
    api.get<AcademicYear>("/academic-years/current").then((r) => r.data),

  create: (data: CreateAcademicYearRequest) =>
    api.post<AcademicYear>("/academic-years", data).then((r) => r.data),

  setCurrent: (id: string) =>
    api.put(`/academic-years/${id}/set-current`).then((r) => r.data),

  remove: (id: string) =>
    api.delete(`/academic-years/${id}`).then((r) => r.data),
};
