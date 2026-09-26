import { keepPreviousData, queryOptions, useMutation, useQuery } from "@tanstack/react-query";
import { guardianApi } from "@/features/guardians/api/guardian";
import type { CreateGuardianRequest, UpdateGuardianRequest, ProvisionGuardianLoginRequest, GuardianListParams } from "@/features/guardians/api/guardian";
import { guardianKeys } from "@/features/guardians/keys";
import { useInvalidate } from "@/shared/api/useInvalidate";

export const useGuardiansByStudent = (studentId: string) =>
  useQuery({ queryKey: guardianKeys.byStudent(studentId), queryFn: () => guardianApi.listByStudent(studentId), enabled: !!studentId });

// Exposed as options so callers outside this feature - e.g. the sidebar's
// prefetch-on-hover - can use it without importing this feature's api/
// module directly (the layer rule: never api/ across a feature boundary).
export const guardiansPageOptions = (params: GuardianListParams = {}) =>
  queryOptions({ queryKey: guardianKeys.list(params), queryFn: () => guardianApi.list(params) });

// The directory; orphansOnly lists guardians linked to no student. Server-
// paginated (docs/SECURITY_AND_PERFORMANCE_PLAYBOOK.md section 4).
export const useGuardians = (params: GuardianListParams = {}) =>
  useQuery({ ...guardiansPageOptions(params), placeholderData: keepPreviousData });

export const useSearchGuardians = (search: string, orphansOnly = false) =>
  useQuery({
    queryKey: guardianKeys.search(search, orphansOnly),
    queryFn: () => guardianApi.list({ search, orphansOnly }),
    enabled: search.trim().length > 0,
  });

export const useGuardianStudents = (guardianId: string) =>
  useQuery({ queryKey: guardianKeys.students(guardianId), queryFn: () => guardianApi.listStudents(guardianId), enabled: !!guardianId });

export const useGuardianNotifications = (guardianId: string) =>
  useQuery({
    queryKey: guardianKeys.notifications(guardianId),
    queryFn: () => guardianApi.listNotifications(guardianId),
    enabled: !!guardianId,
  });

export const useLinkGuardian = (studentId: string) => {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: ({ guardianId, isPrimaryContact }: { guardianId: string; isPrimaryContact: boolean }) =>
      guardianApi.linkToStudent(studentId, guardianId, isPrimaryContact),
    onSuccess: () => invalidate(guardianKeys.all),
  });
};

// Create and link in one step; the result carries possible_duplicates for the caller to warn about.
export const useAddGuardian = (studentId: string) => {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: async ({ data, isPrimaryContact }: { data: CreateGuardianRequest; isPrimaryContact: boolean }) => {
      const result = await guardianApi.create(data);
      await guardianApi.linkToStudent(studentId, result.guardian.id, isPrimaryContact);
      return result;
    },
    onSuccess: () => invalidate(guardianKeys.all),
  });
};

export const useUpdateGuardian = () => {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateGuardianRequest }) => guardianApi.update(id, data),
    onSuccess: () => invalidate(guardianKeys.all),
  });
};

// Blocked server-side while still linked to a student; unlink first.
export const useDeleteGuardian = () => {
  const invalidate = useInvalidate();
  return useMutation({ mutationFn: (id: string) => guardianApi.remove(id), onSuccess: () => invalidate(guardianKeys.all) });
};

export const useUnlinkGuardian = (studentId: string) => {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (guardianId: string) => guardianApi.unlinkFromStudent(studentId, guardianId),
    onSuccess: () => invalidate(guardianKeys.all),
  });
};

export const useSetPrimaryGuardian = (studentId: string) => {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (guardianId: string) => guardianApi.setPrimaryContact(studentId, guardianId),
    onSuccess: () => invalidate(guardianKeys.byStudent(studentId)),
  });
};

export const useProvisionGuardianLogin = (studentId: string) => {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: ({ guardianId, data }: { guardianId: string; data: ProvisionGuardianLoginRequest }) =>
      guardianApi.provisionLogin(guardianId, data),
    onSuccess: () => invalidate(guardianKeys.byStudent(studentId)),
  });
};
