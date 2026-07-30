import api from "../lib/api";

export interface SetupStatus {
  needs_setup: boolean;
}

export interface RegisterAdminRequest {
  email: string;
  username: string;
  given_name: string;
  family_name: string;
  phone_number?: string;
  password: string;
}

export const setupApi = {
  status: () => api.get<SetupStatus>("/setup/status").then((r) => r.data),

  registerAdmin: (data: RegisterAdminRequest) =>
    api.post<{ id: string; email: string }>("/setup/admin", data).then((r) => r.data),
};
