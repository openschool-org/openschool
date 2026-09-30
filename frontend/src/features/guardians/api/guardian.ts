import api from "@/shared/api/client";
import type { Student } from "@/features/students/api/student";
import type { MyNotification } from "@/features/notifications/api/notification";
import type { Page } from "@/shared/api/page";

export type GuardianRelationship = "father" | "mother" | "guardian" | "other";


// Matches db.Guardian JSON shape returned by the backend
export interface Guardian {
  id: string;
  user_id: string | null;
  full_name: string;
  // e.g. "H.A.H.E. Wickramasinghe"; used in lists, registers and printouts
  name_with_initials: string;
  // e.g. "Hasitha"; optional, used in greetings
  calling_name: string;
  relationship: GuardianRelationship;
  phone: string;
  email: string | null;
  nic_number: string;
  created_at: string | null;
}

export interface GuardianWithPrimary extends Guardian {
  is_primary_contact: boolean;
}

export interface CreateGuardianRequest {
  full_name: string;
  // filled in from the full name by the server when empty
  name_with_initials?: string;
  calling_name?: string;
  relationship: GuardianRelationship;
  phone: string;
  email?: string;
  nic_number: string;
}

export interface CreateGuardianResult {
  guardian: Guardian;
  possible_duplicates: Guardian[];
}

export type UpdateGuardianRequest = CreateGuardianRequest;

// No password field, the guardian's NIC number (already on file) becomes
// their initial one-time portal password server-side.
// Names come from the guardian record, so only the username is asked for.
export interface ProvisionGuardianLoginRequest {
  username: string;
}

// /guardians is server-paginated (docs/SECURITY_AND_PERFORMANCE_PLAYBOOK.md
// section 4). limit is capped at 100 server-side regardless of what's asked for.
export interface GuardianListParams {
  limit?: number;
  offset?: number;
  search?: string;
  orphansOnly?: boolean;
}

export const guardianApi = {
  list: (params: GuardianListParams = {}) =>
    api
      .get<Page<Guardian>>("/guardians", {
        params: {
          limit: params.limit,
          offset: params.offset,
          search: params.search,
          ...(params.orphansOnly ? { orphans: "true" } : {}),
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
