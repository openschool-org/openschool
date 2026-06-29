import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { studentApi } from "../services/student";
import type {
  CreateStudentRequest,
  UpdateStudentRequest,
} from "../services/student";

export const STUDENTS_KEY = ["students"];
export const studentKey = (id: string) => ["students", id];
export const studentClassKey = (id: string) => ["students", id, "class"];

export const useStudents = () =>
  useQuery({
    queryKey: STUDENTS_KEY,
    queryFn: studentApi.list,
  });

export const useStudent = (id: string) =>
  useQuery({
    queryKey: studentKey(id),
    queryFn: () => studentApi.get(id),
    enabled: !!id,
  });

export const useStudentWithClass = (id: string) =>
  useQuery({
    queryKey: studentClassKey(id),
    queryFn: () => studentApi.getWithClass(id),
    enabled: !!id,
  });

export const useCreateStudent = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateStudentRequest) => studentApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: STUDENTS_KEY });
    },
  });
};

export const useUpdateStudent = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateStudentRequest }) =>
      studentApi.update(id, data),
    onSuccess: (_data, { id }) => {
      queryClient.invalidateQueries({ queryKey: STUDENTS_KEY });
      queryClient.invalidateQueries({ queryKey: studentKey(id) });
      queryClient.invalidateQueries({ queryKey: studentClassKey(id) });
    },
  });
};

export const useDeleteStudent = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => studentApi.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: STUDENTS_KEY });
    },
  });
};
