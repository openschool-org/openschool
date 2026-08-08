import { useThunderID } from "@thunderid/react";
import { useQuery } from "@tanstack/react-query";
import api from "../lib/api";

export interface Me {
  user_id: string;
  email: string;
  username: string;
  given_name: string;
  family_name: string;
  phone_number: string;
  roles: string[];
  must_change_password: boolean;
}

// Calling GET /me both provisions the local user row on first sign-in (see
// backend's MeHandler) and — as of Phase 8.3 — tells the app whether this
// user is still on a system-assigned default password.
export function useProvisionUser() {
  const { isSignedIn, isLoading } = useThunderID();

  return useQuery({
    queryKey: ["me"],
    queryFn: () => api.get<Me>("/me").then((r) => r.data),
    enabled: !isLoading && isSignedIn,
  });
}
