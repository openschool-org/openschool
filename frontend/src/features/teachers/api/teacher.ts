import api from "@/shared/api/client";
import type { Page } from "@/shared/api/page";

export type TeacherTitle = "Mr" | "Miss" | "Mrs" | "Ms" | "Dr" | "Von" | "Prof";
export type TeacherEmploymentStatus = "active" | "resigned" | "transferred";

// email is only populated by GET /teachers/:id, so it is optional here.
export interface Teacher {
  id: string;
  user_id: string;
  full_name: string;
  // e.g. "H.A.H.E. Wickramasinghe"; used in lists, registers and printouts
  name_with_initials: string;
  // e.g. "Hasitha"; optional, used in greetings
  calling_name: string;
  email?: string;
  employee_number: string;
  nic_number: string;
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

// employee_number is assigned server-side; the NIC number becomes the initial one-time password.
export interface CreateTeacherRequest {
  email: string;
  full_name: string;
  // filled in from the full name by the server when empty
  name_with_initials?: string;
  calling_name?: string;
  phone_number?: string;
  nic_number: string;
  joined_date: string; // RFC3339 timestamp
  title?: TeacherTitle;
  gender?: "male" | "female";
}

// Matches models.UpdateTeacherRequest, employee_number is immutable,
// nic_number is.
export interface UpdateTeacherRequest {
  full_name: string;
  // filled in from the full name by the server when empty
  name_with_initials?: string;
  calling_name?: string;
  phone_number?: string;
  nic_number: string;
  title?: TeacherTitle;
  gender?: "male" | "female";
}

// /teachers is server-paginated (docs/SECURITY_AND_PERFORMANCE_PLAYBOOK.md
// section 4). limit is capped at 100 server-side regardless of what's asked for.
export interface TeacherListParams {
  limit?: number;
  offset?: number;
  search?: string;
  status?: TeacherEmploymentStatus | "";
}

export const teacherApi = {
  list: (params: TeacherListParams = {}) =>
    api.get<Page<Teacher>>("/teachers", { params }).then((r) => r.data),

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

  // Teachers qualified for a subject, to scope the class-subject-teacher picker.
  listBySubject: (subjectId: string) =>
    api.get<Teacher[]>(`/subjects/${subjectId}/teachers`).then((r) => r.data),
};
