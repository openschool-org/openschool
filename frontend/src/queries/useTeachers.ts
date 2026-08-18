// This file defines query and mutation hooks for retrieving and updating teacher profiles, workloads, assigned subjects, and form classes.

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { teacherApi } from "../services/teacher";
import { useCurrentClasses } from "./useClasses";
import type {
  CreateTeacherRequest,
  UpdateTeacherRequest,
  TeacherEmploymentStatus,
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

export interface MyClass {
  class_id: string;
  class_name: string;
  grade_name: string;
  subjects: string[];
}

export const useMyClasses = () => {
  const teacher = useMyTeacherProfile();
  const { data: allClasses, isLoading: classesLoading, isError: classesError } = useCurrentClasses();

  const myFormClasses = allClasses
    ? allClasses
        .filter((c) => c.form_teacher_id === teacher.data?.id)
        .map((c) => ({
          class_id: c.id,
          class_name: c.name,
          grade_name: c.grade_name,
          subjects: [] as string[],
        }))
    : [];

  return {
    teacher: teacher.data,
    classes: myFormClasses,
    isLoading: teacher.isLoading || classesLoading,
    isError: teacher.isError || classesError,
    refetch: teacher.refetch,
  };
};

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

export const useUpdateTeacherEmploymentStatus = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: TeacherEmploymentStatus }) =>
      teacherApi.updateEmploymentStatus(id, status),
    onSuccess: (_data, { id }) => {
      queryClient.invalidateQueries({ queryKey: TEACHERS_KEY });
      queryClient.invalidateQueries({ queryKey: teacherKey(id) });
    },
  });
};

export const useUpdateTeacherHouse = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, houseId }: { id: string; houseId: string }) =>
      teacherApi.updateHouse(id, houseId),
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

export const useAssignTeacherSubject = (teacherId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (subjectId: string) => teacherApi.assignSubject(teacherId, subjectId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: teacherSubjectsKey(teacherId) });
    },
  });
};

export const useRemoveTeacherSubject = (teacherId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (subjectId: string) => teacherApi.removeSubject(teacherId, subjectId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: teacherSubjectsKey(teacherId) });
    },
  });
};

