import { useMutation, useQuery } from "@tanstack/react-query";
import { emailApi } from "@/features/email/api/email";
import { emailKeys } from "@/features/email/keys";

export const useEmailStatus = () => useQuery({ queryKey: emailKeys.status(), queryFn: emailApi.status });

export const useEmailTemplates = () => useQuery({ queryKey: emailKeys.templates(), queryFn: emailApi.templates });

export const useEmailPreview = (key: string) =>
  useQuery({ queryKey: emailKeys.preview(key), queryFn: () => emailApi.preview(key), enabled: key !== "" });

export const useSendTestEmail = () => useMutation({ mutationFn: (template: string) => emailApi.sendTest(template) });
