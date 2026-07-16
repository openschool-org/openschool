import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { mediumApi, levelApi, groupApi } from "../services/curriculum";
import type {
  CreateMediumRequest,
  CreateLevelRequest,
  CreateSelectionGroupRequest,
  AddGroupSubjectRequest,
} from "../services/curriculum";

export const MEDIUMS_KEY = ["mediums"];
export const LEVELS_KEY = ["levels"];

export const levelTreeKey = (id: string) => [...LEVELS_KEY, id, "tree"];
export const groupSubjectsKey = (id: string) => ["groups", id, "subjects"];

export const useMediums = () =>
  useQuery({
    queryKey: MEDIUMS_KEY,
    queryFn: mediumApi.list,
  });

export const useCreateMedium = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateMediumRequest) => mediumApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: MEDIUMS_KEY });
    },
  });
};

export const useUpdateMedium = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: CreateMediumRequest }) =>
      mediumApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: MEDIUMS_KEY });
    },
  });
};

export const useDeleteMedium = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => mediumApi.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: MEDIUMS_KEY });
    },
  });
};

export const useLevels = () =>
  useQuery({
    queryKey: LEVELS_KEY,
    queryFn: levelApi.list,
  });

export const useLevelTree = (id: string) =>
  useQuery({
    queryKey: levelTreeKey(id),
    queryFn: () => levelApi.tree(id),
    enabled: !!id,
  });

export const useCreateLevel = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateLevelRequest) => levelApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: LEVELS_KEY });
    },
  });
};

export const useUpdateLevel = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: CreateLevelRequest }) =>
      levelApi.update(id, data),
    onSuccess: (_data, { id }) => {
      queryClient.invalidateQueries({ queryKey: LEVELS_KEY });
      queryClient.invalidateQueries({ queryKey: levelTreeKey(id) });
    },
  });
};

export const useDuplicateLevel = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: CreateLevelRequest }) =>
      levelApi.duplicate(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: LEVELS_KEY });
    },
  });
};

export const useDeleteLevel = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => levelApi.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: LEVELS_KEY });
    },
  });
};


export const useCreateSelectionGroup = (levelId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateSelectionGroupRequest) =>
      groupApi.create(levelId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: levelTreeKey(levelId) });
    },
  });
};

export const useUpdateSelectionGroup = (levelId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      groupId,
      data,
    }: {
      groupId: string;
      data: CreateSelectionGroupRequest;
    }) => groupApi.update(groupId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: levelTreeKey(levelId) });
    },
  });
};

export const useDeleteSelectionGroup = (levelId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (groupId: string) => groupApi.remove(groupId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: levelTreeKey(levelId) });
    },
  });
};

export const useAddGroupSubject = (levelId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      groupId,
      data,
    }: {
      groupId: string;
      data: AddGroupSubjectRequest;
    }) => groupApi.addSubject(groupId, data),
    onSuccess: (_data, { groupId }) => {
      queryClient.invalidateQueries({ queryKey: levelTreeKey(levelId) });
      queryClient.invalidateQueries({ queryKey: groupSubjectsKey(groupId) });
    },
  });
};

export const useRemoveGroupSubject = (levelId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      groupId,
      subjectId,
    }: {
      groupId: string;
      subjectId: string;
    }) => groupApi.removeSubject(groupId, subjectId),
    onSuccess: (_data, { groupId }) => {
      queryClient.invalidateQueries({ queryKey: levelTreeKey(levelId) });
      queryClient.invalidateQueries({ queryKey: groupSubjectsKey(groupId) });
    },
  });
};
