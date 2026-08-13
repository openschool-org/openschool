import api from "../lib/api";

export type SchoolType = "boys" | "girls" | "mixed";

export interface School {
  id: string;
  name: string;
  address: string | null;
  phone: string | null;
  email: string | null;
  logo_url: string | null;
  // the grade range this instance runs; null when not set
  grade_from: number | null;
  grade_to: number | null;
  // single-sex vs mixed — school-wide, defaults to "mixed"
  school_type: SchoolType;
  created_at: string | null;
}

export interface CreateSchoolRequest {
  name: string;
  address?: string;
  phone?: string;
  email?: string;
  logo_url?: string;
  grade_from?: number | null;
  grade_to?: number | null;
  school_type?: SchoolType;
}

export const schoolApi = {
  get: () => api.get<School>("/school").then((r) => r.data),

  create: (data: CreateSchoolRequest) =>
    api.post<School>("/school", data).then((r) => r.data),

  update: (id: string, data: CreateSchoolRequest) =>
    api.put<School>(`/school/${id}`, data).then((r) => r.data),
};
