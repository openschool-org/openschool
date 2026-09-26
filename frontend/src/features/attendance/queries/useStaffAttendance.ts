import { keepPreviousData, useMutation, useQuery } from "@tanstack/react-query";
import { staffAttendanceApi } from "@/features/attendance/api/staffAttendance";
import type { MarkStaffAttendanceRequest, StaffKind, StaffRosterParams } from "@/features/attendance/api/staffAttendance";
import { staffAttendanceKeys } from "@/features/attendance/keys";
import { useInvalidate } from "@/shared/api/useInvalidate";

export const useStaffAttendanceByDate = (date: string) =>
  useQuery({ queryKey: staffAttendanceKeys.byDate(date), queryFn: () => staffAttendanceApi.byDate(date), enabled: !!date });

// keepPreviousData stops the table flashing empty while the next page loads.
export const useStaffRoster = (date: string, params: StaffRosterParams) =>
  useQuery({
    queryKey: staffAttendanceKeys.roster(date, params),
    queryFn: () => staffAttendanceApi.roster(date, params),
    enabled: !!date,
    placeholderData: keepPreviousData,
  });

export const useStaffMonthly = (year: number, month: number, params: StaffRosterParams) =>
  useQuery({
    queryKey: staffAttendanceKeys.monthly(year, month, params),
    queryFn: () => staffAttendanceApi.monthly(year, month, params),
    placeholderData: keepPreviousData,
  });

export const useMarkUnmarkedPresent = () => {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: ({ date, kind }: { date: string; kind: StaffKind }) => staffAttendanceApi.markUnmarked(date, kind),
    onSuccess: () => invalidate(staffAttendanceKeys.all),
  });
};

// The signed-in teacher's own attendance for one month.
export const useMyStaffAttendanceHistory = (year: number, month: number) =>
  useQuery({ queryKey: staffAttendanceKeys.myHistory(year, month), queryFn: () => staffAttendanceApi.myHistory(year, month) });

export const useMarkStaffAttendance = () => {
  const invalidate = useInvalidate();
  return useMutation({ mutationFn: (data: MarkStaffAttendanceRequest) => staffAttendanceApi.mark(data), onSuccess: () => invalidate(staffAttendanceKeys.all) });
};
