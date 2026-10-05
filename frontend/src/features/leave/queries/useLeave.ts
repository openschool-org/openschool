import { keepPreviousData, useMutation, useQuery } from "@tanstack/react-query";
import { leaveApi } from "@/features/leave/api/leave";
import type { ApplyLeaveRequest, LeaveRegisterParams, PeriodsParams } from "@/features/leave/api/leave";
import { leaveKeys } from "@/features/leave/keys";
import { staffAttendanceKeys } from "@/features/attendance/keys";
import { useInvalidate } from "@/shared/api/useInvalidate";

export const useMyLeave = (year: number) => useQuery({ queryKey: leaveKeys.mine(year), queryFn: () => leaveApi.mine(year) });

export const useMyLeaveBalance = (year: number) =>
  useQuery({ queryKey: leaveKeys.myBalance(year), queryFn: () => leaveApi.myBalance(year) });

export const useMyReliefDuties = () => useQuery({ queryKey: leaveKeys.myReliefDuties(), queryFn: leaveApi.myReliefDuties });

// Only asked once the dates are complete; the server rejects a half-filled form.
export const useAffectedPeriods = (params: PeriodsParams, enabled: boolean) =>
  useQuery({ queryKey: leaveKeys.periods(params), queryFn: () => leaveApi.affectedPeriods(params), enabled, retry: false });

export const useReliefCandidates = (date: string, period: number) =>
  useQuery({ queryKey: leaveKeys.candidates(date, period), queryFn: () => leaveApi.reliefCandidates(date, period) });

export const useApplyLeave = () => {
  const invalidate = useInvalidate();
  return useMutation({ mutationFn: (data: ApplyLeaveRequest) => leaveApi.apply(data), onSuccess: () => invalidate(leaveKeys.all) });
};

export const useCancelLeave = () => {
  const invalidate = useInvalidate();
  return useMutation({ mutationFn: (id: string) => leaveApi.cancel(id), onSuccess: () => invalidate(leaveKeys.all) });
};

export const useLeaveRegister = (params: LeaveRegisterParams) =>
  useQuery({ queryKey: leaveKeys.register(params), queryFn: () => leaveApi.register(params), placeholderData: keepPreviousData });

export const useLeaveDetail = (id: string) =>
  useQuery({ queryKey: leaveKeys.detail(id), queryFn: () => leaveApi.detail(id), enabled: !!id });

// Approval writes leave days onto staff attendance, so that register refreshes too.
export const useDecideLeave = () => {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: ({ id, approve, note }: { id: string; approve: boolean; note: string }) =>
      approve ? leaveApi.approve(id, note) : leaveApi.reject(id, note),
    onSuccess: () => invalidate(leaveKeys.all, staffAttendanceKeys.all),
  });
};

export const useLeaveBalances = (params: { year: number; search?: string; limit: number; offset: number }) =>
  useQuery({ queryKey: leaveKeys.balances(params), queryFn: () => leaveApi.balances(params), placeholderData: keepPreviousData });

export const useDailyRelief = (date: string) =>
  useQuery({ queryKey: leaveKeys.dailyRelief(date), queryFn: () => leaveApi.dailyRelief(date), enabled: !!date });
