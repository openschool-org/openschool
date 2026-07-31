import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { termApi } from "../services/term";
import type { CreateTermRequest, UpdateTermRequest } from "../services/term";

export const termsKey = (academicYearId: string) => ["terms", academicYearId];

export const useTerms = (academicYearId: string | undefined) =>
  useQuery({
    queryKey: termsKey(academicYearId ?? ""),
    queryFn: () => termApi.listByAcademicYear(academicYearId!),
    enabled: !!academicYearId,
  });

export const useCreateTerm = (academicYearId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateTermRequest) => termApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: termsKey(academicYearId) });
    },
  });
};

export const useUpdateTerm = (academicYearId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateTermRequest }) =>
      termApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: termsKey(academicYearId) });
    },
  });
};

export const useSetCurrentTerm = (academicYearId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => termApi.setCurrent(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: termsKey(academicYearId) });
    },
  });
};

export const useDeleteTerm = (academicYearId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => termApi.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: termsKey(academicYearId) });
    },
  });
};
