import api from "../lib/api";
import type { Student } from "./student";
import type { MyNotification } from "./notifications/notification";

export type GuardianRelationship = "father" | "mother" | "guardian" | "other";

export const GUARDIAN_RELATIONSHIPS: { value: GuardianRelationship; label: string }[] = [
  { value: "father", label: "Father" },
  { value: "mother", label: "Mother" },
  { value: "guardian", label: "Guardian" },
  { value: "other", label: "Other" },
];

// Matches db.Guardian JSON shape returned by the backend
export interface Guardian {
  id: string;
  user_id: string | null;
  full_name: string;
  relationship: GuardianRelationship;
  phone: string;
  email: string | null;
  created_at: string | null;
}

export interface GuardianWithPrimary extends Guardian {
  is_primary_contact: boolean;
}

export interface CreateGuardianRequest {
  full_name: string;
  relationship: GuardianRelationship;
  phone: string;
  email?: string;
}

export interface CreateGuardianResult {
  guardian: Guardian;
  possible_duplicates: Guardian[];
}

export type UpdateGuardianRequest = CreateGuardianRequest;

export interface ProvisionGuardianLoginRequest {
  username: string;
  password: string;
  given_name: string;
  family_name: string;
}

export const guardianApi = {
  list: (search?: string, orphansOnly?: boolean) =>
    api
      .get<Guardian[]>("/guardians", {
        params: {
          ...(search ? { search } : {}),
          ...(orphansOnly ? { orphans: "true" } : {}),
        },
      })
      .then((r) => r.data),

  listByStudent: (studentId: string) =>
    api
      .get<GuardianWithPrimary[]>(`/students/${studentId}/guardians`)
      .then((r) => r.data),

  listStudents: (guardianId: string) =>
    api.get<Student[]>(`/guardians/${guardianId}/students`).then((r) => r.data),

  listNotifications: (guardianId: string) =>
    api.get<MyNotification[]>(`/guardians/${guardianId}/notifications`).then((r) => r.data),

  create: (data: CreateGuardianRequest) =>
    api.post<CreateGuardianResult>("/guardians", data).then((r) => r.data),

  update: (id: string, data: UpdateGuardianRequest) =>
    api.put<Guardian>(`/guardians/${id}`, data).then((r) => r.data),

  remove: (id: string) => api.delete(`/guardians/${id}`).then((r) => r.data),

  linkToStudent: (studentId: string, guardianId: string, isPrimaryContact: boolean) =>
    api
      .post(`/students/${studentId}/guardians`, {
        guardian_id: guardianId,
        is_primary_contact: isPrimaryContact,
      })
      .then((r) => r.data),

  unlinkFromStudent: (studentId: string, guardianId: string) =>
    api.delete(`/students/${studentId}/guardians/${guardianId}`).then((r) => r.data),

  setPrimaryContact: (studentId: string, guardianId: string) =>
    api
      .put(`/students/${studentId}/guardians/${guardianId}/set-primary`)
      .then((r) => r.data),

  provisionLogin: (guardianId: string, data: ProvisionGuardianLoginRequest) =>
    api.post<Guardian>(`/guardians/${guardianId}/provision-login`, data).then((r) => r.data),
};
