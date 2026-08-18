import api from "../lib/api";

export interface Subject {
  id: string;
  name: string;
  code: string;
  type: string | null;
  max_marks: number;
  created_at: string;
}

export interface CreateSubjectRequest {
  name: string;
  code: string;
  type?: string;
  max_marks?: number;
}

export const subjectApi = {
  list: () => api.get<Subject[]>("/subjects").then((r) => r.data),

  get: (id: string) => api.get<Subject>(`/subjects/${id}`).then((r) => r.data),

  create: (data: CreateSubjectRequest) =>
    api.post<Subject>("/subjects", data).then((r) => r.data),

  update: (id: string, data: CreateSubjectRequest) =>
    api.put<Subject>(`/subjects/${id}`, data).then((r) => r.data),

  remove: (id: string) => api.delete(`/subjects/${id}`).then((r) => r.data),
};
