import api from "../lib/api";

export type SocietyRole = "leader" | "deputy_leader" | "secretary" | "treasurer" | "member";

// Matches db.ListSocietiesByYearRow
export interface Society {
  id: string;
  name: string;
  teacher_in_charge_id: string;
  academic_year_id: string;
  created_at: string;
  teacher_name: string;
  member_count: number;
}

// Matches db.Society — returned by GET /me/teacher/society, which has no
// join to teacher_profiles (the caller already knows their own name).
export interface SocietyBase {
  id: string;
  name: string;
  teacher_in_charge_id: string;
  academic_year_id: string;
  created_at: string;
}

// Matches db.ListSocietyYearsRow — academic years that have at least one
// society, for the archive view's year selector.
export interface SocietyYear {
  id: string;
  label: string;
  start_date: string;
}

// Matches db.ListSocietyMembersBySocietyRow
export interface SocietyMember {
  id: string;
  society_id: string;
  student_id: string;
  role: SocietyRole;
  academic_year_id: string;
  created_at: string;
  student_name: string;
  student_index: string;
  grade_name: string | null;
}

// Matches db.ListSocietyMembershipsByStudentRow — for the student portfolio.
export interface SocietyMembership {
  id: string;
  society_id: string;
  role: SocietyRole;
  academic_year_id: string;
  created_at: string;
  society_name: string;
  academic_year_label: string;
}

export interface CreateSocietyRequest {
  name: string;
  teacher_in_charge_id: string;
  academic_year_id: string;
}

export interface UpdateSocietyRequest {
  name: string;
  teacher_in_charge_id: string;
}

// The membership's academic year is always the society's own — the backend
// derives it server-side, so it isn't part of this request.
export interface AssignSocietyMemberRequest {
  student_id: string;
  role: SocietyRole;
}

export const societyApi = {
  listByYear: (academicYearId: string) =>
    api.get<Society[]>("/societies", { params: { academic_year_id: academicYearId } }).then((r) => r.data),

  listYears: () => api.get<SocietyYear[]>("/societies/years").then((r) => r.data),

  // The backend returns the raw db.Society row here (no teacher_name/
  // member_count join) — same shape as GET /me/teacher/society.
  create: (data: CreateSocietyRequest) => api.post<SocietyBase>("/societies", data).then((r) => r.data),

  update: (id: string, data: UpdateSocietyRequest) =>
    api.put<SocietyBase>(`/societies/${id}`, data).then((r) => r.data),

  remove: (id: string) => api.delete(`/societies/${id}`).then((r) => r.data),

  listMembers: (societyId: string) =>
    api.get<SocietyMember[]>(`/societies/${societyId}/members`).then((r) => r.data),

  assignMember: (societyId: string, data: AssignSocietyMemberRequest) =>
    api.put<SocietyMember>(`/societies/${societyId}/members`, data).then((r) => r.data),

  removeMember: (societyId: string, memberId: string) =>
    api.delete(`/societies/${societyId}/members/${memberId}`).then((r) => r.data),

  listByStudent: (studentId: string) =>
    api.get<SocietyMembership[]>(`/students/${studentId}/society-memberships`).then((r) => r.data),

  // the society the signed-in teacher is Teacher-in-Charge of, if any
  me: () => api.get<SocietyBase>("/me/teacher/society").then((r) => r.data),
};
