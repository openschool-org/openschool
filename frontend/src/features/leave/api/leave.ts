import api from "@/shared/api/client";
import type { Page } from "@/shared/api/page";

export type LeaveType = "casual" | "sick" | "duty" | "maternity" | "no_pay" | "short";
export type DayPart = "full" | "morning" | "afternoon";
export type LeaveStatus = "pending" | "approved" | "rejected" | "cancelled";

export interface ReliefInput {
  date: string;
  period_number: number;
  class_id: string;
  subject_id?: string;
  relief_teacher_id?: string;
}

export interface ApplyLeaveRequest {
  leave_type: LeaveType;
  start_date: string;
  end_date: string;
  day_part?: DayPart;
  start_time?: string;
  end_time?: string;
  reason: string;
  acting_teacher_id?: string;
  relief?: ReliefInput[];
}

export interface LeaveRequest {
  id: string;
  teacher_id: string;
  teacher_name: string;
  employee_number: string;
  leave_type: LeaveType;
  start_date: string;
  end_date: string;
  day_part: DayPart;
  start_time?: string;
  end_time?: string;
  days: number;
  reason: string;
  acting_teacher_id: string | null;
  acting_teacher_name?: string;
  status: LeaveStatus;
  decided_at: string | null;
  decided_by_name?: string;
  decision_note?: string;
  created_at: string;
}

export interface ReliefPeriod {
  id: string;
  date: string;
  period_number: number;
  class_id: string;
  class_name: string;
  subject_id: string | null;
  subject_name: string;
  relief_teacher_id: string | null;
  relief_teacher_name: string;
}

export interface LeaveRequestDetail extends LeaveRequest {
  relief: ReliefPeriod[];
}

export interface BalanceItem {
  leave_type: LeaveType;
  entitlement: number;
  used: number;
  pending: number;
  remaining: number | null;
}

export interface LeaveBalance {
  year: number;
  items: BalanceItem[];
  short_leave_month: BalanceItem;
}

export interface TeacherBalance {
  teacher_id: string;
  teacher_name: string;
  employee_number: string;
  casual_days: number;
  sick_days: number;
  duty_days: number;
  maternity_days: number;
  no_pay_days: number;
  short_count: number;
}

export interface AffectedPeriod {
  date: string;
  period_number: number;
  start_time: string;
  end_time: string;
  class_id: string;
  class_name: string;
  subject_id: string | null;
  subject_name: string;
}

export interface AffectedPeriods {
  items: AffectedPeriod[];
  truncated: boolean;
}

export interface ReliefCandidate {
  id: string;
  full_name: string;
  employee_number: string;
  relief_periods: number;
}

export interface DailyRelief {
  id: string;
  period_number: number;
  leave_request_id: string;
  leave_status: LeaveStatus;
  leave_type: LeaveType;
  absent_teacher_name: string;
  class_id: string;
  class_name: string;
  subject_name: string;
  relief_teacher_id: string | null;
  relief_teacher_name: string;
}

export interface ReliefDuty {
  id: string;
  date: string;
  period_number: number;
  absent_teacher_name: string;
  class_name: string;
  subject_name: string;
}

export interface LeaveRegisterParams {
  year: number;
  status?: string;
  leave_type?: string;
  search?: string;
  limit: number;
  offset: number;
}

export type PeriodsParams = Pick<ApplyLeaveRequest, "leave_type" | "start_date" | "end_date" | "day_part" | "start_time" | "end_time">;

const clean = <T extends object>(params: T) =>
  Object.fromEntries(Object.entries(params).filter(([, v]) => v !== "" && v !== undefined));

export const leaveApi = {
  mine: (year: number) => api.get<LeaveRequest[]>("/me/teacher/leave", { params: { year } }).then((r) => r.data),
  myBalance: (year: number) => api.get<LeaveBalance>("/me/teacher/leave/balance", { params: { year } }).then((r) => r.data),
  affectedPeriods: (params: PeriodsParams) =>
    api.get<AffectedPeriods>("/me/teacher/leave/periods", { params: clean(params) }).then((r) => r.data),
  myReliefDuties: () => api.get<ReliefDuty[]>("/me/teacher/leave/relief-duties").then((r) => r.data),
  apply: (data: ApplyLeaveRequest) => api.post<LeaveRequestDetail>("/me/teacher/leave", data).then((r) => r.data),
  cancel: (id: string) => api.post(`/me/teacher/leave/${id}/cancel`).then((r) => r.data),

  reliefCandidates: (date: string, periodNumber: number) =>
    api.get<ReliefCandidate[]>("/leave/relief-candidates", { params: { date, period_number: periodNumber } }).then((r) => r.data),
  register: (params: LeaveRegisterParams) =>
    api.get<Page<LeaveRequest>>("/leave/requests", { params: clean(params) }).then((r) => r.data),
  detail: (id: string) => api.get<LeaveRequestDetail>(`/leave/requests/${id}`).then((r) => r.data),
  approve: (id: string, note: string) => api.post<LeaveRequestDetail>(`/leave/requests/${id}/approve`, { note }).then((r) => r.data),
  reject: (id: string, note: string) => api.post<LeaveRequestDetail>(`/leave/requests/${id}/reject`, { note }).then((r) => r.data),
  balances: (params: { year: number; search?: string; limit: number; offset: number }) =>
    api.get<Page<TeacherBalance>>("/leave/balances", { params: clean(params) }).then((r) => r.data),
  dailyRelief: (date: string) => api.get<DailyRelief[]>("/leave/relief", { params: { date } }).then((r) => r.data),
};
