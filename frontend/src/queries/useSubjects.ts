import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { subjectApi } from "../services/subject";
import type { CreateSubjectRequest } from "../services/subject";

export const SUBJECTS_KEY = ["subjects"];

export const useSubjects = () =>
  useQuery({
    queryKey: SUBJECTS_KEY,
    queryFn: subjectApi.list,
  });

export const useSubject = (id: string) =>
  useQuery({
    queryKey: [...SUBJECTS_KEY, id],
    queryFn: () => subjectApi.get(id),
    enabled: !!id,
  });

export const useCreateSubject = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateSubjectRequest) => subjectApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SUBJECTS_KEY });
    },
  });
};

export const useUpdateSubject = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: CreateSubjectRequest }) =>
      subjectApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SUBJECTS_KEY });
    },
  });
};

export const useDeleteSubject = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => subjectApi.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SUBJECTS_KEY });
    },
  });
};
