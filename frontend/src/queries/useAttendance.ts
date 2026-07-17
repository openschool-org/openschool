import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { attendanceApi } from "../services/attendance";
import type { CreateSessionRequest, MarkAttendanceRequest } from "../services/attendance";

export const classSessionsKey = (classId: string) => [
  "classes",
  classId,
  "attendance",
  "sessions",
];
export const sessionKey = (id: string) => ["attendance", "sessions", id];
export const sessionRecordsKey = (id: string) => [
  "attendance",
  "sessions",
  id,
  "records",
];

export const useClassSessions = (classId: string) =>
  useQuery({
    queryKey: classSessionsKey(classId),
    queryFn: () => attendanceApi.listSessionsByClass(classId),
    enabled: !!classId,
  });

export const dailySessionsKey = (date: string) => ["attendance", "sessions", "date", date];

export const useDailySessions = (date: string) =>
  useQuery({
    queryKey: dailySessionsKey(date),
    queryFn: () => attendanceApi.listSessionsByDate(date),
    enabled: !!date,
  });

export const useCreateSession = (classId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateSessionRequest) => attendanceApi.createSession(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: classSessionsKey(classId) });
      queryClient.invalidateQueries({ queryKey: ["attendance"] });
    },
  });
};

export const useSession = (id: string) =>
  useQuery({
    queryKey: sessionKey(id),
    queryFn: () => attendanceApi.getSession(id),
    enabled: !!id,
  });

export const useSessionRecords = (id: string) =>
  useQuery({
    queryKey: sessionRecordsKey(id),
    queryFn: () => attendanceApi.listRecords(id),
    enabled: !!id,
  });

export const useMarkAttendance = (sessionId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: MarkAttendanceRequest) =>
      attendanceApi.markAttendance(sessionId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: sessionRecordsKey(sessionId) });
      queryClient.invalidateQueries({ queryKey: ["attendance"] });
    },
  });
};

export const useDeleteSession = (classId?: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => attendanceApi.deleteSession(id),
    onSuccess: () => {
      if (classId) {
        queryClient.invalidateQueries({ queryKey: classSessionsKey(classId) });
      }
      queryClient.invalidateQueries({ queryKey: ["attendance"] });
    },
  });
};
