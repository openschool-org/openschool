import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { sectionHeadApi } from "../services/sectionHead";
import type { AssignSectionHeadRequest } from "../services/sectionHead";

export const sectionHeadsKey = (academicYearId: string) => ["section-heads", academicYearId];

export const useSectionHeads = (academicYearId: string) =>
  useQuery({
    queryKey: sectionHeadsKey(academicYearId),
    queryFn: () => sectionHeadApi.listByYear(academicYearId),
    enabled: !!academicYearId,
  });

export const useAssignSectionHead = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: AssignSectionHeadRequest) => sectionHeadApi.assign(data),
    onSuccess: (_result, variables) => {
      queryClient.invalidateQueries({ queryKey: sectionHeadsKey(variables.academic_year_id) });
    },
  });
};

export const useRemoveSectionHead = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id }: { id: string; academicYearId: string }) => sectionHeadApi.remove(id),
    onSuccess: (_result, variables) => {
      queryClient.invalidateQueries({ queryKey: sectionHeadsKey(variables.academicYearId) });
    },
  });
};
