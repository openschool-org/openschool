import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { studentPortfolioApi } from "../services/studentPortfolio";
import type {
  CreateProgressReportRequest,
  CreateActivityRequest,
  CreateLeadershipRoleRequest,
  CreateAwardRequest,
  CreateDisciplinaryRecordRequest,
} from "../services/studentPortfolio";

const progressReportsKey = (studentId: string) => ["students", studentId, "progress-reports"];
const activitiesKey = (studentId: string) => ["students", studentId, "activities"];
const leadershipRolesKey = (studentId: string) => ["students", studentId, "leadership-roles"];
const awardsKey = (studentId: string) => ["students", studentId, "awards"];
const disciplinaryRecordsKey = (studentId: string) => ["students", studentId, "disciplinary-records"];
export const prefectAppointmentsKey = (studentId: string) => ["students", studentId, "prefect-appointments"];

// Progress reports

export const useProgressReports = (studentId: string) =>
  useQuery({
    queryKey: progressReportsKey(studentId),
    queryFn: () => studentPortfolioApi.listProgressReports(studentId),
    enabled: !!studentId,
  });

export const useCreateProgressReport = (studentId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateProgressReportRequest) =>
      studentPortfolioApi.createProgressReport(studentId, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: progressReportsKey(studentId) }),
  });
};

export const useUpdateProgressReport = (studentId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ recordId, narrative }: { recordId: string; narrative: string }) =>
      studentPortfolioApi.updateProgressReport(studentId, recordId, narrative),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: progressReportsKey(studentId) }),
  });
};

export const useDeleteProgressReport = (studentId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (recordId: string) => studentPortfolioApi.deleteProgressReport(studentId, recordId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: progressReportsKey(studentId) }),
  });
};

// Activities

export const useStudentActivities = (studentId: string) =>
  useQuery({
    queryKey: activitiesKey(studentId),
    queryFn: () => studentPortfolioApi.listActivities(studentId),
    enabled: !!studentId,
  });

export const useCreateStudentActivity = (studentId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateActivityRequest) => studentPortfolioApi.createActivity(studentId, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: activitiesKey(studentId) }),
  });
};

export const useDeleteStudentActivity = (studentId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (recordId: string) => studentPortfolioApi.deleteActivity(studentId, recordId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: activitiesKey(studentId) }),
  });
};

// Leadership roles

export const useLeadershipRoles = (studentId: string) =>
  useQuery({
    queryKey: leadershipRolesKey(studentId),
    queryFn: () => studentPortfolioApi.listLeadershipRoles(studentId),
    enabled: !!studentId,
  });

export const useCreateLeadershipRole = (studentId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateLeadershipRoleRequest) =>
      studentPortfolioApi.createLeadershipRole(studentId, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: leadershipRolesKey(studentId) }),
  });
};

export const useDeleteLeadershipRole = (studentId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (recordId: string) => studentPortfolioApi.deleteLeadershipRole(studentId, recordId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: leadershipRolesKey(studentId) }),
  });
};

// Awards

export const useStudentAwards = (studentId: string) =>
  useQuery({
    queryKey: awardsKey(studentId),
    queryFn: () => studentPortfolioApi.listAwards(studentId),
    enabled: !!studentId,
  });

export const useCreateStudentAward = (studentId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateAwardRequest) => studentPortfolioApi.createAward(studentId, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: awardsKey(studentId) }),
  });
};

export const useDeleteStudentAward = (studentId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (recordId: string) => studentPortfolioApi.deleteAward(studentId, recordId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: awardsKey(studentId) }),
  });
};

// Disciplinary records

export const useDisciplinaryRecords = (studentId: string) =>
  useQuery({
    queryKey: disciplinaryRecordsKey(studentId),
    queryFn: () => studentPortfolioApi.listDisciplinaryRecords(studentId),
    enabled: !!studentId,
  });

export const useCreateDisciplinaryRecord = (studentId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateDisciplinaryRecordRequest) =>
      studentPortfolioApi.createDisciplinaryRecord(studentId, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: disciplinaryRecordsKey(studentId) }),
  });
};

export const useDeleteDisciplinaryRecord = (studentId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (recordId: string) => studentPortfolioApi.deleteDisciplinaryRecord(studentId, recordId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: disciplinaryRecordsKey(studentId) }),
  });
};

// Prefect appointments (read-only rollup)

export const usePrefectAppointmentsByStudent = (studentId: string) =>
  useQuery({
    queryKey: prefectAppointmentsKey(studentId),
    queryFn: () => studentPortfolioApi.listPrefectAppointments(studentId),
    enabled: !!studentId,
  });
