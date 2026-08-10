import api from "../lib/api";

export type SelfServiceResetRole = "teacher" | "student" | "parent";

// Matches models.ForgotPasswordRequest — identifier is the account's email;
// secret is whatever was set as the initial default password (Phase 8.2):
// NIC number for teacher/parent, index number for student. Admin isn't
// accepted here — there's no secondary secret on file for an admin account.
export interface ForgotPasswordRequest {
  role: SelfServiceResetRole;
  identifier: string;
  secret: string;
}

export interface ForgotPasswordResponse {
  reset_token: string;
  expires_at: string;
}

export interface ResetPasswordRequest {
  token: string;
  new_password: string;
}

export interface ChangePasswordRequest {
  new_password: string;
}

export const authApi = {
  forgotPassword: (data: ForgotPasswordRequest) =>
    api.post<ForgotPasswordResponse>("/auth/forgot-password", data).then((r) => r.data),

  resetPassword: (data: ResetPasswordRequest) =>
    api.post("/auth/reset-password", data).then((r) => r.data),

  // Requires an authenticated session — used for both the "Change password"
  // profile action and the first-login "Set a new password" choice.
  changePassword: (data: ChangePasswordRequest) =>
    api.post("/auth/change-password", data).then((r) => r.data),

  // The first-login "Keep this password" choice — clears the must-change
  // flag without touching the password.
  keepDefaultPassword: () => api.post("/auth/keep-default-password").then((r) => r.data),
};
