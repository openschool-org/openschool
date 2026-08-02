import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { timetableApi } from "../../services/timetable/timetable";
import type { TimetableEntryInput } from "../../services/timetable/timetable";

export const timetablesByClassKey = (classId: string, academicYearId: string) => [
  "timetables",
  "class",
  classId,
  academicYearId,
];
export const timetablesByYearKey = (academicYearId: string) => ["timetables", "year", academicYearId];
export const timetableKey = (id: string) => ["timetables", id];
export const timetableEntriesKey = (id: string) => ["timetables", id, "entries"];
export const timetableValidationKey = (id: string) => ["timetables", id, "validate"];
export const timetableHistoryKey = (id: string) => ["timetables", id, "history"];
export const reviewQueueKey = (academicYearId: string) => ["timetable-reviews", academicYearId];
export const myTeacherScheduleKey = (academicYearId: string) => ["t", "timetable", academicYearId];
export const myClassTimetableKey = ["timetable", "my-class"];
export const childTimetableKey = (studentId: string) => ["timetable", "child", studentId];

const invalidateTimetable = (queryClient: ReturnType<typeof useQueryClient>, id: string) => {
  queryClient.invalidateQueries({ queryKey: timetableKey(id) });
  queryClient.invalidateQueries({ queryKey: timetableEntriesKey(id) });
  queryClient.invalidateQueries({ queryKey: timetableValidationKey(id) });
  queryClient.invalidateQueries({ queryKey: timetableHistoryKey(id) });
  queryClient.invalidateQueries({ queryKey: ["timetables"] });
  queryClient.invalidateQueries({ queryKey: ["timetable-reviews"] });
};

export const useTimetablesByClass = (classId: string, academicYearId: string) =>
  useQuery({
    queryKey: timetablesByClassKey(classId, academicYearId),
    queryFn: () => timetableApi.listByClass(classId, academicYearId),
    enabled: !!classId && !!academicYearId,
  });

export const useTimetablesByYear = (academicYearId: string) =>
  useQuery({
    queryKey: timetablesByYearKey(academicYearId),
    queryFn: () => timetableApi.listByYear(academicYearId),
    enabled: !!academicYearId,
  });

export const useTimetable = (id: string) =>
  useQuery({
    queryKey: timetableKey(id),
    queryFn: () => timetableApi.get(id),
    enabled: !!id,
  });

export const useTimetableEntries = (id: string) =>
  useQuery({
    queryKey: timetableEntriesKey(id),
    queryFn: () => timetableApi.getEntries(id),
    enabled: !!id,
  });

export const useTimetableValidation = (id: string) =>
  useQuery({
    queryKey: timetableValidationKey(id),
    queryFn: () => timetableApi.validate(id),
    enabled: !!id,
  });

export const useTimetableStatusHistory = (id: string) =>
  useQuery({
    queryKey: timetableHistoryKey(id),
    queryFn: () => timetableApi.statusHistory(id),
    enabled: !!id,
  });

export const useCreateTimetable = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { academic_year_id: string; class_id: string }) => timetableApi.create(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["timetables"] }),
  });
};

export const useCopyTimetable = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { academic_year_id: string; class_id: string; source_timetable_id: string }) =>
      timetableApi.copyFrom(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["timetables"] }),
  });
};

export const useReviseTimetable = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (publishedId: string) => timetableApi.revise(publishedId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["timetables"] }),
  });
};

export const useDeleteTimetable = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => timetableApi.remove(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["timetables"] }),
  });
};

export const useSaveTimetableEntries = (id: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (entries: TimetableEntryInput[]) => timetableApi.saveEntries(id, entries),
    onSuccess: () => invalidateTimetable(queryClient, id),
  });
};

export const useDeleteTimetableEntry = (id: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ day, period }: { day: number; period: number }) => timetableApi.deleteEntry(id, day, period),
    onSuccess: () => invalidateTimetable(queryClient, id),
  });
};

export const useSubmitTimetable = (id: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => timetableApi.submit(id),
    onSuccess: () => invalidateTimetable(queryClient, id),
  });
};

export const usePublishTimetable = (id: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => timetableApi.publish(id),
    onSuccess: () => invalidateTimetable(queryClient, id),
  });
};

export const useApproveTimetable = (id: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (comment?: string) => timetableApi.approve(id, comment),
    onSuccess: () => invalidateTimetable(queryClient, id),
  });
};

export const useRejectTimetable = (id: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (comment: string) => timetableApi.reject(id, comment),
    onSuccess: () => invalidateTimetable(queryClient, id),
  });
};

export const useReviewQueue = (academicYearId: string) =>
  useQuery({
    queryKey: reviewQueueKey(academicYearId),
    queryFn: () => timetableApi.reviewQueue(academicYearId),
    enabled: !!academicYearId,
  });

export const useMyTeacherSchedule = (academicYearId: string) =>
  useQuery({
    queryKey: myTeacherScheduleKey(academicYearId),
    queryFn: () => timetableApi.myTeacherSchedule(academicYearId),
    enabled: !!academicYearId,
  });

export const useMyClassTimetable = () =>
  useQuery({
    queryKey: myClassTimetableKey,
    queryFn: timetableApi.myClassTimetable,
    retry: false,
  });

export const useChildTimetable = (studentId: string) =>
  useQuery({
    queryKey: childTimetableKey(studentId),
    queryFn: () => timetableApi.childTimetable(studentId),
    enabled: !!studentId,
    retry: false,
  });
