import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { identityReconciliationApi } from "../services/identityReconciliation";

export const ORPHANED_ACCOUNTS_KEY = ["orphaned-accounts"];

// Not auto-refreshing — this hits ThunderID's GET /users, paginated across
// the whole account list, so it's deliberately only fetched when the admin
// opens this tab (queries/useSchool.ts-style always-on hooks would be
// wasteful here).
export const useOrphanedAccounts = (enabled: boolean) =>
  useQuery({
    queryKey: ORPHANED_ACCOUNTS_KEY,
    queryFn: identityReconciliationApi.list,
    enabled,
  });

export const useDeleteOrphanedAccount = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => identityReconciliationApi.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ORPHANED_ACCOUNTS_KEY });
    },
  });
};
