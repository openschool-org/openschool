import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { classApi } from "../services/class";
import { streamApi } from "../services/stream";
import { studentApi } from "../services/student";
import type { CreateClassRequest, UpdateClassRequest } from "../services/class";

export const CLASSES_KEY = ["classes"];
export const CURRENT_CLASSES_KEY = ["classes", "current"];
export const STREAMS_KEY = ["streams"];

export const classKey = (id: string) => ["classes", id];
export const classStudentsKey = (id: string) => ["classes", id, "students"];
export const classSubjectTeachersKey = (id: string) => [
  "classes",
  id,
  "subject-teachers",
];

export const streamGroupsKey = (streamId: string) => [
  ...STREAMS_KEY,
  streamId,
  "groups",
];

export const useCurrentClasses = () =>
  useQuery({
    queryKey: CURRENT_CLASSES_KEY,
    queryFn: classApi.listCurrent,
  });

export const useCreateClass = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateClassRequest) => classApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CLASSES_KEY });
    },
  });
};

export const useDeleteClass = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => classApi.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CLASSES_KEY });
    },
  });
};

export const useClass = (id: string) =>
  useQuery({
    queryKey: classKey(id),
    queryFn: () => classApi.get(id),
    enabled: !!id,
  });

export const useClassStudents = (id: string) =>
  useQuery({
    queryKey: classStudentsKey(id),
    queryFn: () => studentApi.listByClass(id),
    enabled: !!id,
  });

export const useClassSubjectTeachers = (id: string) =>
  useQuery({
    queryKey: classSubjectTeachersKey(id),
    queryFn: () => classApi.listSubjectTeachers(id),
    enabled: !!id,
  });

export const useUpdateClass = (classId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: UpdateClassRequest) => classApi.update(classId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: classKey(classId) });
      queryClient.invalidateQueries({ queryKey: CLASSES_KEY });
      queryClient.invalidateQueries({ queryKey: CURRENT_CLASSES_KEY });
    },
  });
};

export const useAssignFormTeacher = (classId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (teacherId: string) =>
      classApi.assignFormTeacher(classId, teacherId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: classKey(classId) });
      queryClient.invalidateQueries({ queryKey: CURRENT_CLASSES_KEY });
    },
  });
};

export const useEnrollStudent = (classId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (studentId: string) =>
      classApi.enrollStudent(classId, studentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: classStudentsKey(classId) });
    },
  });
};

export const useUnenrollStudent = (classId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (studentId: string) =>
      classApi.unenrollStudent(classId, studentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: classStudentsKey(classId) });
    },
  });
};

export const useStreams = () =>
  useQuery({
    queryKey: STREAMS_KEY,
    queryFn: streamApi.list,
  });

export const useStreamGroups = (streamId: string) =>
  useQuery({
    queryKey: streamGroupsKey(streamId),
    queryFn: () => streamApi.listGroups(streamId),
    enabled: !!streamId,
  });
