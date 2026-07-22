import api from "../lib/api";

export interface Student {
  id: string;
  user_id: string | null;
  full_name: string;
  index_number: string;
  address: string | null;
  phone: string | null;
  whatsapp: string | null;
  special_remarks: string | null;
  gender: string | null;
  created_at: string | null;
  updated_at: string | null;
  class_name: string | null;
  grade_name: string | null;
  house_id: string | null;
  house_name: string | null;
}

export interface StudentWithClass extends Student {
  class_name: string | null;
  grade_name: string | null;
  academic_year: string | null;
}

export interface CreateStudentRequest {
  email: string;
  given_name: string;
  family_name: string;
  phone_number?: string;
  password: string;
  index_number: string;
  address?: string;
  whatsapp?: string;
  special_remarks?: string;
  gender?: "male" | "female";
}

export interface UpdateStudentRequest {
  given_name: string;
  family_name: string;
  phone_number?: string;
  address?: string;
  whatsapp?: string;
  special_remarks?: string;
  gender?: "male" | "female";
}

export const studentApi = {
  list: () => api.get<Student[]>("/students").then((r) => r.data),

  get: (id: string) => api.get<Student>(`/students/${id}`).then((r) => r.data),

  getWithClass: (id: string) =>
    api.get<StudentWithClass>(`/students/${id}/class`).then((r) => r.data),

  listByClass: (classId: string) =>
    api.get<Student[]>(`/classes/${classId}/students`).then((r) => r.data),

  create: (data: CreateStudentRequest) =>
    api.post<Student>("/students", data).then((r) => r.data),

  update: (id: string, data: UpdateStudentRequest) =>
    api.put<Student>(`/students/${id}`, data).then((r) => r.data),

  updateHouse: (id: string, houseId: string) =>
    api
      .put<Student>(`/students/${id}/house`, { house_id: houseId })
      .then((r) => r.data),

  remove: (id: string) =>
    api.delete(`/students/${id}`).then((r) => r.data),
};
