import { useMutation, useQueryClient } from "@tanstack/react-query";
import { authApi } from "../services/auth";
import type { ForgotPasswordRequest, ResetPasswordRequest } from "../services/auth";

export const useForgotPassword = () =>
  useMutation({
    mutationFn: (data: ForgotPasswordRequest) => authApi.forgotPassword(data),
  });

export const useResetPassword = () =>
  useMutation({
    mutationFn: (data: ResetPasswordRequest) => authApi.resetPassword(data),
  });

export const useChangePassword = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (newPassword: string) => authApi.changePassword({ new_password: newPassword }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["me"] }),
  });
};

export const useKeepDefaultPassword = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => authApi.keepDefaultPassword(),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["me"] }),
  });
};
