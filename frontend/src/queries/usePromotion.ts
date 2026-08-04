import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { promotionApi } from "../services/promotion";
import type { CommitAssignmentsRequest } from "../services/promotion";
import { classesByYearKey } from "./useClasses";

export const promotionPreviewKey = (sourceYearId: string, targetYearId: string, rankByTermId?: string) => [
  "promotion",
  "preview",
  sourceYearId,
  targetYearId,
  rankByTermId ?? null,
];

export const usePromotionPreview = (sourceYearId: string, targetYearId: string, rankByTermId?: string) =>
  useQuery({
    queryKey: promotionPreviewKey(sourceYearId, targetYearId, rankByTermId),
    queryFn: () =>
      promotionApi.preview({
        source_year_id: sourceYearId,
        target_year_id: targetYearId,
        rank_by_term_id: rankByTermId || undefined,
      }),
    enabled: !!sourceYearId && !!targetYearId,
  });

export const useCommitAssignments = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CommitAssignmentsRequest) => promotionApi.commit(data),
    onSuccess: (_result, variables) => {
      // the target year's class rosters just changed
      queryClient.invalidateQueries({ queryKey: classesByYearKey(variables.academic_year_id) });
      queryClient.invalidateQueries({ queryKey: ["promotion", "preview"] });
    },
  });
};
