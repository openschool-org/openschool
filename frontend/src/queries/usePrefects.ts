import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { prefectApi } from "../services/prefect";
import type { AssignPrefectRequest } from "../services/prefect";

export const prefectsKey = (academicYearId: string) => ["prefects", academicYearId];

export const usePrefects = (academicYearId: string) =>
  useQuery({
    queryKey: prefectsKey(academicYearId),
    queryFn: () => prefectApi.listByYear(academicYearId),
    enabled: !!academicYearId,
  });

export const useAssignPrefect = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: AssignPrefectRequest) => prefectApi.assign(data),
    onSuccess: (_result, variables) => {
      queryClient.invalidateQueries({ queryKey: prefectsKey(variables.academic_year_id) });
    },
  });
};

export const useRemovePrefect = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id }: { id: string; academicYearId: string }) => prefectApi.remove(id),
    onSuccess: (_result, variables) => {
      queryClient.invalidateQueries({ queryKey: prefectsKey(variables.academicYearId) });
    },
  });
};
