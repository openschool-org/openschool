import { useMutation, useQuery } from "@tanstack/react-query";
import { activationApi } from "@/features/activation/api/activation";
import type { ActivationSettings, CompleteActivationRequest, GenerateCodesRequest, StartActivationRequest } from "@/features/activation/api/activation";
import { activationKeys } from "@/features/activation/keys";
import { useInvalidate } from "@/shared/api/useInvalidate";

export const useActivationStatus = () => useQuery({ queryKey: activationKeys.status(), queryFn: activationApi.status });

export const useStartActivation = () => useMutation({ mutationFn: (data: StartActivationRequest) => activationApi.start(data) });

export const useCompleteActivation = () => useMutation({ mutationFn: (data: CompleteActivationRequest) => activationApi.complete(data) });

export const useActivationSettings = () => useQuery({ queryKey: activationKeys.settings(), queryFn: activationApi.getSettings });

export const useUpdateActivationSettings = () => {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (data: ActivationSettings) => activationApi.updateSettings(data),
    onSuccess: () => invalidate(activationKeys.all),
  });
};

export const useActivationBatches = () => useQuery({ queryKey: activationKeys.batches(), queryFn: activationApi.batches });

export const useGenerateCodes = () => {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (data: GenerateCodesRequest) => activationApi.generate(data),
    onSuccess: () => invalidate(activationKeys.batches()),
  });
};

// A mutation, not a query, so codes are fetched only on request and never kept in the cache.
export const useBatchCodes = () => useMutation({ mutationFn: (batchId: string) => activationApi.batchCodes(batchId) });

export const useRevokeBatch = () => {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (batchId: string) => activationApi.revokeBatch(batchId),
    onSuccess: () => invalidate(activationKeys.batches()),
  });
};
