import { keepPreviousData, queryOptions, useMutation, useQuery } from "@tanstack/react-query";
import { teacherApi } from "@/features/teachers/api/teacher";
import type { CreateTeacherRequest, UpdateTeacherRequest, TeacherEmploymentStatus, TeacherListParams } from "@/features/teachers/api/teacher";
import { teacherKeys } from "@/features/teachers/keys";
import { useCurrentClasses } from "@/features/academics/queries/useClasses";
import { useInvalidate } from "@/shared/api/useInvalidate";

// Exposed as options so callers outside this feature - e.g. the sidebar's
// prefetch-on-hover - can use it without importing this feature's api/
// module directly (the layer rule: never api/ across a feature boundary).
export const teachersPageOptions = (params: TeacherListParams = {}) =>
  queryOptions({ queryKey: teacherKeys.list(params), queryFn: () => teacherApi.list(params) });

// /teachers is server-paginated; the response is a Page<Teacher>, not a bare
// array (docs/SECURITY_AND_PERFORMANCE_PLAYBOOK.md section 4).
export const useTeachers = (params: TeacherListParams = {}) =>
  useQuery({ ...teachersPageOptions(params), placeholderData: keepPreviousData });

// Exposed as options (like teachersPageOptions above) so a name-lookup-by-id
// elsewhere - e.g. resolving a class's form_teacher_id - can use useQueries
// without importing this feature's api/ module directly (the layer rule:
// never api/ across a feature boundary).
export const teacherDetailOptions = (id: string) =>
  queryOptions({ queryKey: teacherKeys.detail(id), queryFn: () => teacherApi.get(id), enabled: !!id });

export const useTeacher = (id: string) => useQuery(teacherDetailOptions(id));

export const useTeacherSubjects = (id: string) =>
  useQuery({ queryKey: teacherKeys.subjects(id), queryFn: () => teacherApi.listSubjects(id), enabled: !!id });

export const useMyTeacherProfile = () => useQuery({ queryKey: teacherKeys.me(), queryFn: teacherApi.me });

// Teachers qualified for a subject; scopes the class-subject-teacher picker.
export const useTeachersBySubject = (subjectId: string) =>
  useQuery({ queryKey: teacherKeys.bySubject(subjectId), queryFn: () => teacherApi.listBySubject(subjectId), enabled: !!subjectId });

export const useTeacherWorkload = (id: string) =>
  useQuery({ queryKey: teacherKeys.workload(id), queryFn: () => teacherApi.workload(id), enabled: !!id });

export interface MyClass {
  class_id: string;
  class_name: string;
  grade_name: string;
  subjects: string[];
  isFormTeacher: boolean;
}

// Form-teacher classes plus every class where the teacher takes a subject this year.
export const useMyClasses = () => {
  const teacher = useMyTeacherProfile();
  const teacherId = teacher.data?.id ?? "";
  const { data: allClasses, isLoading: classesLoading, isError: classesError } = useCurrentClasses();
  const { data: workload, isLoading: workloadLoading, isError: workloadError } = useTeacherWorkload(teacherId);

  const classMap = new Map<string, MyClass>();
  for (const c of allClasses ?? []) {
    if (c.form_teacher_id === teacherId) {
      classMap.set(c.id, { class_id: c.id, class_name: c.name, grade_name: c.grade_name, subjects: [], isFormTeacher: true });
    }
  }
  for (const w of workload ?? []) {
    if (!w.academic_year_is_current) continue;
    const existing = classMap.get(w.class_id);
    if (existing) {
      if (!existing.subjects.includes(w.subject_name)) existing.subjects.push(w.subject_name);
    } else {
      classMap.set(w.class_id, { class_id: w.class_id, class_name: w.class_name, grade_name: w.grade_name, subjects: [w.subject_name], isFormTeacher: false });
    }
  }

  return {
    teacher: teacher.data,
    classes: [...classMap.values()],
    isLoading: teacher.isLoading || classesLoading || workloadLoading,
    isError: teacher.isError || classesError || workloadError,
    refetch: teacher.refetch,
  };
};

export const useCreateTeacher = () => {
  const invalidate = useInvalidate();
  return useMutation({ mutationFn: (data: CreateTeacherRequest) => teacherApi.create(data), onSuccess: () => invalidate(teacherKeys.all) });
};

export const useUpdateTeacher = () => {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateTeacherRequest }) => teacherApi.update(id, data),
    onSuccess: () => invalidate(teacherKeys.all),
  });
};

export const useUpdateTeacherEmploymentStatus = () => {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: TeacherEmploymentStatus }) => teacherApi.updateEmploymentStatus(id, status),
    onSuccess: () => invalidate(teacherKeys.all),
  });
};

export const useUpdateTeacherHouse = () => {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: ({ id, houseId }: { id: string; houseId: string }) => teacherApi.updateHouse(id, houseId),
    onSuccess: () => invalidate(teacherKeys.all),
  });
};

export const useDeleteTeacher = () => {
  const invalidate = useInvalidate();
  return useMutation({ mutationFn: (id: string) => teacherApi.remove(id), onSuccess: () => invalidate(teacherKeys.all) });
};

export const useAssignTeacherSubject = (teacherId: string) => {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (subjectId: string) => teacherApi.assignSubject(teacherId, subjectId),
    onSuccess: () => invalidate(teacherKeys.subjects(teacherId)),
  });
};

export const useRemoveTeacherSubject = (teacherId: string) => {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (subjectId: string) => teacherApi.removeSubject(teacherId, subjectId),
    onSuccess: () => invalidate(teacherKeys.subjects(teacherId)),
  });
};
