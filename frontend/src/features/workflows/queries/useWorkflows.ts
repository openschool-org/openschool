import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { workflowApi, type Inputs, type Run } from "@/features/workflows/api/workflows";
import { workflowKeys } from "@/features/workflows/keys";
import { useInvalidate } from "@/shared/api/useInvalidate";

export const useWorkflowCatalog = () => useQuery({ queryKey: workflowKeys.catalog(), queryFn: workflowApi.catalog });

export const useWorkflowHistory = (key: string) =>
  useQuery({ queryKey: workflowKeys.history(key), queryFn: () => workflowApi.history(key), enabled: !!key });

export const useWorkflowRun = (id: string | undefined) =>
  useQuery({ queryKey: workflowKeys.run(id ?? ""), queryFn: () => workflowApi.run(id!), enabled: !!id });

export const useCheckWorkflow = (key: string) => useMutation({ mutationFn: (inputs: Inputs) => workflowApi.check(key, inputs) });

// Everything a run touches (classes, years, students) can change, so the whole cache refreshes after a write.
const useRefreshAll = () => {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries();
};

export const useProposeWorkflow = (key: string) => {
  const invalidate = useInvalidate();
  return useMutation({ mutationFn: (inputs: Inputs) => workflowApi.propose(key, inputs), onSuccess: () => invalidate(workflowKeys.all) });
};

export const useEditRun = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, section, rowId, cells }: { id: string; section: string; rowId: string; cells: Record<string, string> }) =>
      workflowApi.edit(id, section, rowId, cells),
    onSuccess: (run: Run) => queryClient.setQueryData(workflowKeys.run(run.id), run),
  });
};

export const useApplyRun = () => {
  const refresh = useRefreshAll();
  return useMutation({ mutationFn: (id: string) => workflowApi.apply(id), onSuccess: refresh });
};

export const useDiscardRun = () => {
  const invalidate = useInvalidate();
  return useMutation({ mutationFn: (id: string) => workflowApi.discard(id), onSuccess: () => invalidate(workflowKeys.all) });
};

export const useRevertRun = () => {
  const refresh = useRefreshAll();
  return useMutation({ mutationFn: (id: string) => workflowApi.revert(id), onSuccess: refresh });
};
