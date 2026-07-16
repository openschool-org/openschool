import api from "../lib/api";


export interface Grade {
  id: string;
  name: string;
  sort_order: number;
  created_at: string;
}

export interface CreateGradeRequest {
  name: string;
  sort_order: number;
}

export const gradeApi = {
  list: () => api.get<Grade[]>("/grades").then((r) => r.data),

  create: (data: CreateGradeRequest) =>
    api.post<Grade>("/grades", data).then((r) => r.data),

  update: (id: string, data: CreateGradeRequest) =>
    api.put<Grade>(`/grades/${id}`, data).then((r) => r.data),

  remove: (id: string) => api.delete(`/grades/${id}`).then((r) => r.data),
};
