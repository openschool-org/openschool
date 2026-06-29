import api from "../lib/api";

export interface School {
  id: string;
  name: string;
  address: string;
  phone: string;
  email: string;
  logo_url: string;
  created_at: string;
}

export interface CreateSchoolRequest {
  name: string;
  address?: string;
  phone?: string;
  email?: string;
  logo_url?: string;
}

export const schoolApi = {
  get: () => api.get<School>("/school").then((r) => r.data),

  create: (data: CreateSchoolRequest) =>
    api.post<School>("/school", data).then((r) => r.data),

  update: (id: string, data: CreateSchoolRequest) =>
    api.put<School>(`/school/${id}`, data).then((r) => r.data),
};
