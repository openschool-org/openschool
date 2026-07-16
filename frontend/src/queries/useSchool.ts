import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { schoolApi } from "../services/school";
import type { CreateSchoolRequest } from "../services/school";

export const SCHOOL_KEY = ["school"];

export const useSchool = () =>
  useQuery({
    queryKey: SCHOOL_KEY,
    queryFn: schoolApi.get,
  });

export const useCreateSchool = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateSchoolRequest) => schoolApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SCHOOL_KEY });
    },
  });
};

export const useUpdateSchool = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: CreateSchoolRequest }) =>
      schoolApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SCHOOL_KEY });
    },
  });
};
