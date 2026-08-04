import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { positionApi } from "../services/position";
import type { AssignPrincipalRequest, AssignVicePrincipalRequest } from "../services/position";

export const POSITIONS_KEY = ["positions"];
export const MY_POSITION_KEY = ["me", "teacher", "position"];

export const usePositions = () =>
  useQuery({
    queryKey: POSITIONS_KEY,
    queryFn: positionApi.list,
  });

// The signed-in teacher's own rank + notification reach — drives dashboard
// and notification-composer role differentiation. `enabled` defaults to
// true; pass false when the caller isn't a teacher (e.g. admin), since
// /me/teacher/position 404s for accounts with no linked teacher_profile.
export const useMyPosition = (enabled = true) =>
  useQuery({
    queryKey: MY_POSITION_KEY,
    queryFn: positionApi.mySummary,
    enabled,
  });

export const useAssignPrincipal = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: AssignPrincipalRequest) => positionApi.assignPrincipal(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: POSITIONS_KEY });
    },
  });
};

export const useAssignVicePrincipal = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: AssignVicePrincipalRequest) => positionApi.assignVicePrincipal(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: POSITIONS_KEY });
    },
  });
};

export const useRemovePosition = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => positionApi.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: POSITIONS_KEY });
    },
  });
};
