import { useMutation, useQuery } from "@tanstack/react-query";
import { positionApi } from "@/features/positions/api/position";
import type { AssignPrincipalRequest, AssignVicePrincipalRequest } from "@/features/positions/api/position";
import { positionKeys } from "@/features/positions/keys";
import { useInvalidate } from "@/shared/api/useInvalidate";

export const usePositions = () => useQuery({ queryKey: positionKeys.list(), queryFn: positionApi.list });

// Pass enabled=false for non-teacher accounts; the endpoint 404s without a teacher profile.
export const useMyPosition = (enabled = true) =>
  useQuery({ queryKey: positionKeys.mine(), queryFn: positionApi.mySummary, enabled });

// 403s below Section Head rank; callers pass enabled=false for lower ranks.
export const useMyLeadershipOverview = (enabled: boolean) =>
  useQuery({ queryKey: positionKeys.myLeadershipOverview(), queryFn: positionApi.myLeadershipOverview, enabled });

export const useAssignPrincipal = () => {
  const invalidate = useInvalidate();
  return useMutation({ mutationFn: (data: AssignPrincipalRequest) => positionApi.assignPrincipal(data), onSuccess: () => invalidate(positionKeys.all) });
};

export const useAssignVicePrincipal = () => {
  const invalidate = useInvalidate();
  return useMutation({ mutationFn: (data: AssignVicePrincipalRequest) => positionApi.assignVicePrincipal(data), onSuccess: () => invalidate(positionKeys.all) });
};

export const useRemovePosition = () => {
  const invalidate = useInvalidate();
  return useMutation({ mutationFn: (id: string) => positionApi.remove(id), onSuccess: () => invalidate(positionKeys.all) });
};

export const useMyLedClasses = (enabled: boolean) =>
  useQuery({ queryKey: positionKeys.myLedClasses(), queryFn: positionApi.myLedClasses, enabled });
