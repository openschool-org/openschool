import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { guardianApi } from "../services/guardian";
import type {
  CreateGuardianRequest,
  ProvisionGuardianLoginRequest,
} from "../services/guardian";

export const guardiansKey = (studentId: string) => ["guardians", studentId];

export const useGuardiansByStudent = (studentId: string) =>
  useQuery({
    queryKey: guardiansKey(studentId),
    queryFn: () => guardianApi.listByStudent(studentId),
    enabled: !!studentId,
  });

// Creates a new guardian record and links it to the student in one step —
// there's no "search existing guardians" UI yet, so every add is a new one.
export const useAddGuardian = (studentId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      data,
      isPrimaryContact,
    }: {
      data: CreateGuardianRequest;
      isPrimaryContact: boolean;
    }) => {
      const guardian = await guardianApi.create(data);
      await guardianApi.linkToStudent(studentId, guardian.id, isPrimaryContact);
      return guardian;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: guardiansKey(studentId) });
    },
  });
};

export const useUnlinkGuardian = (studentId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (guardianId: string) =>
      guardianApi.unlinkFromStudent(studentId, guardianId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: guardiansKey(studentId) });
    },
  });
};

export const useSetPrimaryGuardian = (studentId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (guardianId: string) =>
      guardianApi.setPrimaryContact(studentId, guardianId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: guardiansKey(studentId) });
    },
  });
};

export const useProvisionGuardianLogin = (studentId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      guardianId,
      data,
    }: {
      guardianId: string;
      data: ProvisionGuardianLoginRequest;
    }) => guardianApi.provisionLogin(guardianId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: guardiansKey(studentId) });
    },
  });
};
