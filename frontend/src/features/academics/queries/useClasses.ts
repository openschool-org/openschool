import { useMutation, useQuery } from "@tanstack/react-query";
import { classApi } from "@/features/academics/api/class";
import { streamApi } from "@/features/academics/api/stream";
import type { CreateClassRequest, UpdateClassRequest } from "@/features/academics/api/class";
import { classKeys, streamKeys } from "@/features/academics/keys";
import { studentKeys } from "@/features/students/keys";
import { useInvalidate } from "@/shared/api/useInvalidate";
import { timetableKeys } from "@/features/timetable/keys";

export const useCurrentClasses = () => useQuery({ queryKey: classKeys.current(), queryFn: classApi.listCurrent });

export const useClassesByAcademicYear = (academicYearId: string) =>
  useQuery({
    queryKey: classKeys.byYear(academicYearId),
    queryFn: () => classApi.listByAcademicYear(academicYearId),
    enabled: !!academicYearId,
  });

export const useClass = (id: string) =>
  useQuery({ queryKey: classKeys.detail(id), queryFn: () => classApi.get(id), enabled: !!id });

export const useClassSubjectTeachers = (classId: string) =>
  useQuery({
    queryKey: classKeys.subjectTeachers(classId),
    queryFn: () => classApi.listSubjectTeachers(classId),
    enabled: !!classId,
  });

export const useCreateClass = () => {
  const invalidate = useInvalidate();
  // The backend may create a homeroom too, so the classroom list is refreshed as well.
  return useMutation({ mutationFn: (data: CreateClassRequest) => classApi.create(data), onSuccess: () => invalidate(classKeys.all, timetableKeys.classrooms()) });
};

export const useDeleteClass = () => {
  const invalidate = useInvalidate();
  return useMutation({ mutationFn: (id: string) => classApi.remove(id), onSuccess: () => invalidate(classKeys.all) });
};

export const useUpdateClass = (classId: string) => {
  const invalidate = useInvalidate();
  return useMutation({ mutationFn: (data: UpdateClassRequest) => classApi.update(classId, data), onSuccess: () => invalidate(classKeys.all) });
};

export const useAssignFormTeacher = (classId: string) => {
  const invalidate = useInvalidate();
  return useMutation({ mutationFn: (teacherId: string) => classApi.assignFormTeacher(classId, teacherId), onSuccess: () => invalidate(classKeys.all) });
};

export const useAssignMonitors = (classId: string) => {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (data: { girl_monitor_id?: string | null; boy_monitor_id?: string | null }) => classApi.assignMonitors(classId, data),
    onSuccess: () => invalidate(classKeys.all),
  });
};

export const useAssignSubjectTeacher = (classId: string) => {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (data: { subject_id: string; teacher_id: string }) => classApi.assignSubjectTeacher(classId, data),
    onSuccess: () => invalidate(classKeys.subjectTeachers(classId)),
  });
};

// Rosters are cached under the students feature, so enrolment changes invalidate there.
export const useEnrollStudent = (classId: string) => {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (studentId: string) => classApi.enrollStudent(classId, studentId),
    onSuccess: () => invalidate(studentKeys.byClass(classId), studentKeys.list()),
  });
};

export const useUnenrollStudent = (classId: string) => {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (studentId: string) => classApi.unenrollStudent(classId, studentId),
    onSuccess: () => invalidate(studentKeys.byClass(classId), studentKeys.list()),
  });
};

export const useStreams = () => useQuery({ queryKey: streamKeys.all, queryFn: streamApi.list });

export const useStreamGroups = (streamId: string) =>
  useQuery({ queryKey: streamKeys.groups(streamId), queryFn: () => streamApi.listGroups(streamId), enabled: !!streamId });

export const useCreateStream = () => {
  const invalidate = useInvalidate();
  return useMutation({ mutationFn: (data: { name: string }) => streamApi.create(data), onSuccess: () => invalidate(streamKeys.all) });
};

export const useCreateStreamGroup = () => {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: ({ streamId, data }: { streamId: string; data: { name: string } }) => streamApi.createGroup(streamId, data),
    onSuccess: (_group, { streamId }) => invalidate(streamKeys.groups(streamId)),
  });
};
