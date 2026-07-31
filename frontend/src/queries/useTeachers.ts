import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { teacherApi } from "../services/teacher";
import type {
  CreateTeacherRequest,
  UpdateTeacherRequest,
} from "../services/teacher";

export const TEACHERS_KEY = ["teachers"];
export const teacherKey = (id: string) => ["teachers", id];
export const teacherSubjectsKey = (id: string) => ["teachers", id, "subjects"];
export const teacherWorkloadKey = (id: string) => ["teachers", id, "workload"];
export const MY_TEACHER_PROFILE_KEY = ["me", "teacher"];

export const useTeachers = () =>
  useQuery({
    queryKey: TEACHERS_KEY,
    queryFn: teacherApi.list,
  });

export const useTeacher = (id: string) =>
  useQuery({
    queryKey: teacherKey(id),
    queryFn: () => teacherApi.get(id),
    enabled: !!id,
  });

export const useTeacherSubjects = (id: string) =>
  useQuery({
    queryKey: teacherSubjectsKey(id),
    queryFn: () => teacherApi.listSubjects(id),
    enabled: !!id,
  });

// The signed-in teacher's own profile — resolves their teacher_profile ID
// from the JWT server-side. Everything else (classes, sessions, marks) is
// then fetched with that ID via the normal admin/teacher-shared endpoints.
export const useMyTeacherProfile = () =>
  useQuery({
    queryKey: MY_TEACHER_PROFILE_KEY,
    queryFn: teacherApi.me,
  });

export const useTeacherWorkload = (id: string) =>
  useQuery({
    queryKey: teacherWorkloadKey(id),
    queryFn: () => teacherApi.workload(id),
    enabled: !!id,
  });

export const useCreateTeacher = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateTeacherRequest) => teacherApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TEACHERS_KEY });
    },
  });
};

export const useUpdateTeacher = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateTeacherRequest }) =>
      teacherApi.update(id, data),
    onSuccess: (_data, { id }) => {
      queryClient.invalidateQueries({ queryKey: TEACHERS_KEY });
      queryClient.invalidateQueries({ queryKey: teacherKey(id) });
    },
  });
};

export const useDeleteTeacher = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => teacherApi.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TEACHERS_KEY });
    },
  });
};
