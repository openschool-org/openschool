import api from "../lib/api";

export type TeacherTitle = "Mr" | "Miss" | "Mrs" | "Ms" | "Dr" | "Von" | "Prof";
export type TeacherEmploymentStatus = "active" | "resigned" | "transferred";

// Matches db.TeacherProfile JSON shape returned by the backend
export interface Teacher {
  id: string;
  user_id: string;
  full_name: string;
  employee_number: string;
  joined_date: string | null;
  phone: string | null;
  title: TeacherTitle | null;
  gender: "male" | "female" | null;
  is_active: boolean;
  house_id: string | null;
  employment_status: TeacherEmploymentStatus;
  created_at: string | null;
  updated_at: string | null;
}

// Matches db.ListTeacherWorkloadRow
export interface TeacherWorkloadRow {
  subject_id: string;
  subject_name: string;
  class_id: string;
  class_name: string;
  grade_name: string;
  academic_year_id: string;
  academic_year_label: string;
  academic_year_is_current: boolean;
}

// Matches db.Subject
export interface TeacherSubject {
  id: string;
  name: string;
  code: string;
  created_at: string | null;
}

// Matches models.CreateTeacherRequest — employee_number is auto-assigned
// server-side (Phase 6.1), not supplied here.
export interface CreateTeacherRequest {
  email: string;
  given_name: string;
  family_name: string;
  phone_number?: string;
  password: string;
  joined_date: string; // RFC3339 timestamp
  title?: TeacherTitle;
  gender?: "male" | "female";
}

// Matches models.UpdateTeacherRequest — employee_number is immutable.
export interface UpdateTeacherRequest {
  given_name: string;
  family_name: string;
  phone_number?: string;
  title?: TeacherTitle;
  gender?: "male" | "female";
}

export const teacherApi = {
  list: () => api.get<Teacher[]>("/teachers").then((r) => r.data),

  get: (id: string) => api.get<Teacher>(`/teachers/${id}`).then((r) => r.data),

  // The signed-in teacher's own profile, resolved server-side from the JWT.
  me: () => api.get<Teacher>("/me/teacher").then((r) => r.data),

  workload: (id: string) =>
    api.get<TeacherWorkloadRow[]>(`/teachers/${id}/workload`).then((r) => r.data),

  create: (data: CreateTeacherRequest) =>
    api.post<Teacher>("/teachers", data).then((r) => r.data),

  update: (id: string, data: UpdateTeacherRequest) =>
    api.put<Teacher>(`/teachers/${id}`, data).then((r) => r.data),

  updateHouse: (id: string, houseId: string) =>
    api
      .put<Teacher>(`/teachers/${id}/house`, { house_id: houseId })
      .then((r) => r.data),

  updateEmploymentStatus: (id: string, status: TeacherEmploymentStatus) =>
    api
      .put<Teacher>(`/teachers/${id}/employment-status`, { status })
      .then((r) => r.data),

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
