import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { classroomApi } from "../../services/timetable/classroom";
import type { ClassroomRequest } from "../../services/timetable/classroom";

export const CLASSROOMS_KEY = ["classrooms"];

export const useClassrooms = () =>
  useQuery({
    queryKey: CLASSROOMS_KEY,
    queryFn: classroomApi.list,
  });

export const useCreateClassroom = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: ClassroomRequest) => classroomApi.create(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: CLASSROOMS_KEY }),
  });
};

export const useUpdateClassroom = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: ClassroomRequest }) => classroomApi.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: CLASSROOMS_KEY }),
  });
};

export const useDeleteClassroom = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => classroomApi.remove(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: CLASSROOMS_KEY }),
  });
};
