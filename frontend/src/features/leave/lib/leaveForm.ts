import type { DayPart, LeaveType, PeriodsParams } from "@/features/leave/api/leave";
import { HALF_DAY_TYPES } from "@/features/leave/constants";

export interface LeaveFormValues {
  leaveType: LeaveType;
  startDate: string;
  endDate: string;
  dayPart: DayPart;
  startTime: string;
  endTime: string;
  reason: string;
  actingTeacherId: string;
}

// Short leave and half days cover one day, so the end date follows the start date.
export const isSingleDay = (v: LeaveFormValues) => v.leaveType === "short" || v.dayPart !== "full";
export const effectiveEndDate = (v: LeaveFormValues) => (isSingleDay(v) ? v.startDate : v.endDate);

// Applies one field change: a type without half days resets to a full day, and the end date never runs before the start.
export function withChange<K extends keyof LeaveFormValues>(prev: LeaveFormValues, key: K, value: LeaveFormValues[K]): LeaveFormValues {
  const next = { ...prev, [key]: value };
  if (key === "leaveType" && !HALF_DAY_TYPES.includes(value as LeaveType)) next.dayPart = "full";
  if (isSingleDay(next) || next.endDate < next.startDate) next.endDate = next.startDate;
  return next;
}

export function periodsParams(v: LeaveFormValues): PeriodsParams {
  const isShort = v.leaveType === "short";
  return {
    leave_type: v.leaveType,
    start_date: v.startDate,
    end_date: effectiveEndDate(v),
    day_part: isShort ? undefined : v.dayPart,
    start_time: isShort ? v.startTime : undefined,
    end_time: isShort ? v.endTime : undefined,
  };
}

// The missed periods can be looked up once the dates (and, for short leave, both times) are set.
export function datesReady(v: LeaveFormValues): boolean {
  const end = effectiveEndDate(v);
  return !!v.startDate && !!end && end >= v.startDate && (v.leaveType !== "short" || (!!v.startTime && !!v.endTime));
}

export function leaveFormErrors(v: LeaveFormValues): Partial<Record<keyof LeaveFormValues, string>> {
  const isShort = v.leaveType === "short";
  const errors: Partial<Record<keyof LeaveFormValues, string>> = {};
  if (!v.reason.trim()) errors.reason = "Give a reason for the leave";
  if (!isShort && effectiveEndDate(v) < v.startDate) errors.endDate = "The last day cannot be before the first day";
  if (isShort && (!v.startTime || !v.endTime)) errors.startTime = "Give the time you leave and return";
  if (isShort && v.startTime && v.endTime && v.endTime <= v.startTime) errors.endTime = "Return time must be after the leaving time";
  return errors;
}
