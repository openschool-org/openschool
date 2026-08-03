import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { guardianApi } from "../services/guardian";
import type {
  CreateGuardianRequest,
  UpdateGuardianRequest,
  ProvisionGuardianLoginRequest,
} from "../services/guardian";

export const guardiansKey = (studentId: string) => ["guardians", studentId];
export const ALL_GUARDIANS_KEY = ["guardians"];
export const orphanGuardiansKey = ["guardians", "orphans"];
export const guardianSearchKey = (search: string) => ["guardians", "search", search];
export const guardianStudentsKey = (guardianId: string) => ["guardians", guardianId, "students"];
export const guardianNotificationsKey = (guardianId: string) => ["guardians", guardianId, "notifications"];

export const useGuardiansByStudent = (studentId: string) =>
  useQuery({
    queryKey: guardiansKey(studentId),
    queryFn: () => guardianApi.listByStudent(studentId),
    enabled: !!studentId,
  });

// Every guardian on file, for the "link existing guardian" search picker
// and the directory's default (unfiltered) listing. Pass orphansOnly to
// show only guardians linked to no student (e.g. their last child left).
export const useGuardians = (orphansOnly = false) =>
  useQuery({
    queryKey: orphansOnly ? orphanGuardiansKey : ALL_GUARDIANS_KEY,
    queryFn: () => guardianApi.list(undefined, orphansOnly),
  });

// Debounced search against the same endpoint — used by the guardian
// directory and the "search before creating a new record" add-guardian
// flow, so siblings can share a guardian instead of duplicating it.
export const useSearchGuardians = (search: string, orphansOnly = false) =>
  useQuery({
    queryKey: [...guardianSearchKey(search), orphansOnly],
    queryFn: () => guardianApi.list(search, orphansOnly),
    enabled: search.trim().length > 0,
  });

export const useGuardianStudents = (guardianId: string) =>
  useQuery({
    queryKey: guardianStudentsKey(guardianId),
    queryFn: () => guardianApi.listStudents(guardianId),
    enabled: !!guardianId,
  });

export const useGuardianNotifications = (guardianId: string) =>
  useQuery({
    queryKey: guardianNotificationsKey(guardianId),
    queryFn: () => guardianApi.listNotifications(guardianId),
    enabled: !!guardianId,
  });

export const useLinkGuardian = (studentId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      guardianId,
      isPrimaryContact,
    }: {
      guardianId: string;
      isPrimaryContact: boolean;
    }) => guardianApi.linkToStudent(studentId, guardianId, isPrimaryContact),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: guardiansKey(studentId) });
    },
  });
};

// Creates a new guardian record and links it to the student in one step —
// for guardians who aren't already on file elsewhere. The result also
// carries any possible_duplicates the backend found by phone/email, so the
// caller can warn "this guardian may already exist."
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
      const result = await guardianApi.create(data);
      await guardianApi.linkToStudent(studentId, result.guardian.id, isPrimaryContact);
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: guardiansKey(studentId) });
      queryClient.invalidateQueries({ queryKey: ALL_GUARDIANS_KEY });
    },
  });
};

export const useUpdateGuardian = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateGuardianRequest }) =>
      guardianApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ALL_GUARDIANS_KEY });
    },
  });
};

// Delete is blocked server-side while the guardian is still linked to any
// student — the caller should unlink first (see useUnlinkGuardian).
export const useDeleteGuardian = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => guardianApi.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ALL_GUARDIANS_KEY });
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
