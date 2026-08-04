import api from "../lib/api";

export type PositionType = "principal" | "vice_principal";

// Principal/Vice Principal are permanent appointments — not scoped to an
// academic year, unlike Section Head/Prefect. They last until an admin
// removes/reassigns them (resignation or promotion).
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

export const positionApi = {
  list: () => api.get<TeacherPosition[]>("/positions").then((r) => r.data),

  assignPrincipal: (data: AssignPrincipalRequest) =>
    api.put<TeacherPosition>("/positions/principal", data).then((r) => r.data),

  assignVicePrincipal: (data: AssignVicePrincipalRequest) =>
    api.put<TeacherPosition>("/positions/vice-principal", data).then((r) => r.data),

  remove: (id: string) => api.delete(`/positions/${id}`).then((r) => r.data),

  mySummary: () => api.get<PositionSummary>("/me/teacher/position").then((r) => r.data),
};
