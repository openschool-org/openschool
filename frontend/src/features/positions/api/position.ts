import api from "@/shared/api/client";

export type PositionType = "principal" | "vice_principal";

// Principal and Vice Principal are permanent appointments, not scoped to an academic year.
export interface TeacherPosition {
  id: string;
  teacher_id: string;
  position: PositionType;
  notify_whole_school: boolean;
  scope_note: string | null;
  created_at: string;
  teacher_name: string;
}

export interface AssignPrincipalRequest {
  teacher_id: string;
}

export interface AssignVicePrincipalRequest {
  teacher_id: string;
  notify_whole_school: boolean;
  grade_ids: string[];
}

export type PositionRankLabel =
  | "Principal"
  | "Vice Principal"
  | "Section Head"
  | "Class Teacher"
  | "Subject Teacher"
  | "Teacher";

export interface PositionSummary {
  rank: number;
  rank_label: PositionRankLabel;
  notify_whole_school: boolean;
}

// Scoped counts for the leadership dashboard panel: "school" for unrestricted reach, "grades" for a grade-scoped role.
export interface LeadershipOverviewSummary {
  scope: "school" | "grades";
  grade_names: string[];
  class_count: number;
  student_count: number;
  sessions_marked_today: number;
  sessions_pending_today: number;
}

export const positionApi = {
  list: () => api.get<TeacherPosition[]>("/positions").then((r) => r.data),

  assignPrincipal: (data: AssignPrincipalRequest) =>
    api.put<TeacherPosition>("/positions/principal", data).then((r) => r.data),

  assignVicePrincipal: (data: AssignVicePrincipalRequest) =>
    api.put<TeacherPosition>("/positions/vice-principal", data).then((r) => r.data),

  remove: (id: string) => api.delete(`/positions/${id}`).then((r) => r.data),

  mySummary: () => api.get<PositionSummary>("/me/teacher/position").then((r) => r.data),

  myLeadershipOverview: () =>
    api.get<LeadershipOverviewSummary>("/me/teacher/leadership-overview").then((r) => r.data),

  myLedClasses: () => api.get<LedClass[]>("/me/teacher/led-classes").then((r) => r.data),
};

// Matches leadership.LedClass: a class a section head (or principal / vice principal) oversees.
export interface LedClass {
  id: string;
  name: string;
  grade_name: string;
}
