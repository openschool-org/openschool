import api from "../../lib/api";

export type ClassroomType = "regular" | "lab" | "eca";

export interface Classroom {
  id: string;
  name: string;
  code: string | null;
  capacity: number | null;
  created_at: string | null;
  room_type: ClassroomType;
  subject_id: string | null;
  subject_name: string | null;
}

export interface ClassroomRequest {
  name: string;
  code?: string;
  capacity?: number | null;
  room_type: ClassroomType;
  // required when room_type is "lab" — which subject this lab is for.
  subject_id?: string | null;
}

export const classroomApi = {
  list: () => api.get<Classroom[]>("/classrooms").then((r) => r.data),

  create: (data: ClassroomRequest) =>
    api.post<Classroom>("/classrooms", data).then((r) => r.data),

  update: (id: string, data: ClassroomRequest) =>
    api.put<Classroom>(`/classrooms/${id}`, data).then((r) => r.data),

  remove: (id: string) => api.delete(`/classrooms/${id}`).then((r) => r.data),
};
