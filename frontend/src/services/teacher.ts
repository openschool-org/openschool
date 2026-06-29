import api from "../lib/api";

// Matches db.TeacherProfile JSON shape returned by the backend
export interface Teacher {
  id: string;
  user_id: string;
  full_name: string;
  employee_number: string;
  joined_date: string | null;
  phone: string | null;
  created_at: string | null;
  updated_at: string | null;
}

// Matches db.Subject
export interface TeacherSubject {
  id: string;
  name: string;
  code: string;
  created_at: string | null;
}

// Matches models.CreateTeacherRequest
export interface CreateTeacherRequest {
  email: string;
  given_name: string;
  family_name: string;
  phone_number?: string;
  password: string;
  employee_number: string;
  joined_date: string; // RFC3339 timestamp
}

// Matches models.UpdateTeacherRequest
export interface UpdateTeacherRequest {
  given_name: string;
  family_name: string;
  phone_number?: string;
  employee_number: string;
}

export const teacherApi = {
  list: () => api.get<Teacher[]>("/teachers").then((r) => r.data),

  get: (id: string) => api.get<Teacher>(`/teachers/${id}`).then((r) => r.data),

  create: (data: CreateTeacherRequest) =>
    api.post<Teacher>("/teachers", data).then((r) => r.data),

  update: (id: string, data: UpdateTeacherRequest) =>
    api.put<Teacher>(`/teachers/${id}`, data).then((r) => r.data),

  remove: (id: string) =>
    api.delete(`/teachers/${id}`).then((r) => r.data),

  listSubjects: (id: string) =>
    api.get<TeacherSubject[]>(`/teachers/${id}/subjects`).then((r) => r.data),

  assignSubject: (id: string, subjectId: string) =>
    api
      .post(`/teachers/${id}/subjects`, { subject_id: subjectId })
      .then((r) => r.data),

  removeSubject: (id: string, subjectId: string) =>
    api.delete(`/teachers/${id}/subjects/${subjectId}`).then((r) => r.data),
};
