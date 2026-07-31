import { useMutation, useQuery } from "@tanstack/react-query";
import { setupApi } from "../services/setup";
import type { RegisterAdminRequest } from "../services/setup";

export const useSetupStatus = () =>
  useQuery({
    queryKey: ["setup-status"],
    queryFn: setupApi.status,
    // Only matters once, before an admin exists — no need to keep polling
    // after the app has settled on an answer.
    staleTime: Infinity,
    retry: false,
  });

export const useRegisterAdmin = () =>
  useMutation({
    mutationFn: (data: RegisterAdminRequest) => setupApi.registerAdmin(data),
  });
