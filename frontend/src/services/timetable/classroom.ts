import api from "../../lib/api";

export interface Classroom {
  id: string;
  name: string;
  code: string | null;
  capacity: number | null;
  created_at: string | null;
}

export interface ClassroomRequest {
  name: string;
  code?: string;
  capacity?: number | null;
}

export const classroomApi = {
  list: () => api.get<Classroom[]>("/classrooms").then((r) => r.data),

  create: (data: ClassroomRequest) =>
    api.post<Classroom>("/classrooms", data).then((r) => r.data),

  update: (id: string, data: ClassroomRequest) =>
    api.put<Classroom>(`/classrooms/${id}`, data).then((r) => r.data),

  remove: (id: string) => api.delete(`/classrooms/${id}`).then((r) => r.data),
};
