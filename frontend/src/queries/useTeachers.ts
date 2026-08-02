import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { teacherApi } from "../services/teacher";
import type {
  CreateTeacherRequest,
  UpdateTeacherRequest,
  TeacherWorkloadRow,
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

export interface MyClass {
  class_id: string;
  class_name: string;
  grade_name: string;
  subjects: string[];
}

function buildMyClasses(workload: TeacherWorkloadRow[] | undefined): MyClass[] {
  if (!workload) return [];
  const byClass = new Map<string, MyClass>();
  for (const row of workload) {
    if (!row.academic_year_is_current) continue;
    const existing = byClass.get(row.class_id);
    if (existing) {
      if (!existing.subjects.includes(row.subject_name)) existing.subjects.push(row.subject_name);
    } else {
      byClass.set(row.class_id, {
        class_id: row.class_id,
        class_name: row.class_name,
        grade_name: row.grade_name,
        subjects: [row.subject_name],
      });
    }
  }
  return [...byClass.values()].sort((a, b) => a.grade_name.localeCompare(b.grade_name, undefined, { numeric: true }));
}

// The signed-in teacher's current-year classes, deduped from their subject
// workload rows and sorted by grade. Shared by every teacher-portal page
// that needs "my classes" (dashboard, roster, attendance, profile stats).
export const useMyClasses = () => {
  const teacher = useMyTeacherProfile();
  const workload = useTeacherWorkload(teacher.data?.id ?? "");
  return {
    teacher: teacher.data,
    classes: buildMyClasses(workload.data),
    isLoading: teacher.isLoading || workload.isLoading,
    isError: teacher.isError || workload.isError,
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

export const useDeleteTeacher = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => teacherApi.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TEACHERS_KEY });
    },
  });
};
