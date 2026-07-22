import api from "../lib/api";

export interface House {
  id: string;
  name: string;
  code: string | null;
  remainder: number;
  created_at: string;
}

export interface CreateHouseRequest {
  name: string;
  code?: string;
  remainder: number;
}

export const houseApi = {
  list: () => api.get<House[]>("/houses").then((r) => r.data),

  create: (data: CreateHouseRequest) =>
    api.post<House>("/houses", data).then((r) => r.data),

  update: (id: string, data: CreateHouseRequest) =>
    api.put<House>(`/houses/${id}`, data).then((r) => r.data),

  remove: (id: string) => api.delete(`/houses/${id}`).then((r) => r.data),

  reassignMissing: () =>
    api
      .post<{ assigned: number }>("/houses/reassign-missing")
      .then((r) => r.data),
};
