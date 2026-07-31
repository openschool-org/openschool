import api from "../lib/api";

export type GuardianRelationship = "father" | "mother" | "guardian" | "other";

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

export interface ProvisionGuardianLoginRequest {
  username: string;
  password: string;
  given_name: string;
  family_name: string;
}

export const guardianApi = {
  listByStudent: (studentId: string) =>
    api
      .get<GuardianWithPrimary[]>(`/students/${studentId}/guardians`)
      .then((r) => r.data),

  create: (data: CreateGuardianRequest) =>
    api.post<Guardian>("/guardians", data).then((r) => r.data),

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
