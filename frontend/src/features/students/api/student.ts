import api from "@/shared/api/client";
import type { Page } from "@/shared/api/page";

export type StudentEnrollmentStatus = "active" | "left";

export interface Student {
  id: string;
  user_id: string | null;
  full_name: string;
  // e.g. "H.A.H.E. Wickramasinghe"; used in lists, registers and printouts
  name_with_initials: string;
  // e.g. "Hasitha"; optional, used in greetings
  calling_name: string;
  index_number: string;
  address: string | null;
  phone: string | null;
  whatsapp: string | null;
  special_remarks: string | null;
  gender: string | null;
  enrollment_status: StudentEnrollmentStatus;
  created_at: string | null;
  updated_at: string | null;
  class_name: string | null;
  grade_name: string | null;
  house_id: string | null;
  house_name: string | null;
}

export interface StudentWithClass extends Student {
  email: string | null;
  class_name: string | null;
  grade_name: string | null;
  academic_year: string | null;
}

// No password field, the student's index number becomes their initial
// one-time password server-side.
export interface CreateStudentRequest {
  email: string;
  full_name: string;
  // filled in from the full name by the server when empty
  name_with_initials?: string;
  calling_name?: string;
  phone_number?: string;
  index_number: string;
  address?: string;
  whatsapp?: string;
  special_remarks?: string;
  gender?: "male" | "female";
}

export interface UpdateStudentRequest {
  full_name: string;
  // filled in from the full name by the server when empty
  name_with_initials?: string;
  calling_name?: string;
  phone_number?: string;
  address?: string;
  whatsapp?: string;
  special_remarks?: string;
  gender?: "male" | "female";
}

// /students is server-paginated (docs/SECURITY_AND_PERFORMANCE_PLAYBOOK.md
// section 4). limit is capped at 100 server-side regardless of what's asked for.
export interface StudentListParams {
  limit?: number;
  offset?: number;
  search?: string;
  grade?: string;
  class?: string;
  gender?: string;
  house?: string;
}

export const studentApi = {
  list: (params: StudentListParams = {}) =>
    api.get<Page<Student>>("/students", { params }).then((r) => r.data),

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

  updateEnrollmentStatus: (id: string, status: StudentEnrollmentStatus) =>
    api
      .put<Student>(`/students/${id}/enrollment-status`, { status })
      .then((r) => r.data),

  remove: (id: string) => api.delete(`/students/${id}`).then((r) => r.data),
};
