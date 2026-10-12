import { useMemo, useState } from "react";
import type { AffectedPeriod, ApplyLeaveRequest, DayPart, LeaveType, PeriodsParams } from "@/features/leave/api/leave";
import { HALF_DAY_TYPES } from "@/features/leave/constants";
import { useAffectedPeriods } from "@/features/leave/queries/useLeave";
import { todayISODate } from "@/shared/lib/date";

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

const initial = (): LeaveFormValues => ({
  leaveType: "casual",
  startDate: todayISODate(),
  endDate: todayISODate(),
  dayPart: "full",
  startTime: "",
  endTime: "",
  reason: "",
  actingTeacherId: "",
});

export const periodKey = (p: Pick<AffectedPeriod, "date" | "period_number" | "class_id">) => `${p.date}|${p.period_number}|${p.class_id}`;

// Holds the application form and the relief picks for the periods it would miss.
export function useLeaveForm() {
  const [values, setValues] = useState<LeaveFormValues>(initial);
  const [relief, setRelief] = useState<Record<string, string>>({});

  const isShort = values.leaveType === "short";
  const singleDay = isShort || values.dayPart !== "full";
  const endDate = singleDay ? values.startDate : values.endDate;

  // Changing the type or dates changes which periods are missed, so stale picks are dropped.
  const set = <K extends keyof LeaveFormValues>(key: K, value: LeaveFormValues[K]) => {
    setValues((prev) => {
      const next = { ...prev, [key]: value };
      if (key === "leaveType" && !HALF_DAY_TYPES.includes(value as LeaveType)) next.dayPart = "full";
      return next;
    });
    if (key !== "reason" && key !== "actingTeacherId") setRelief({});
  };

  const params: PeriodsParams = useMemo(
    () => ({
      leave_type: values.leaveType,
      start_date: values.startDate,
      end_date: endDate,
      day_part: isShort ? undefined : values.dayPart,
      start_time: isShort ? values.startTime : undefined,
      end_time: isShort ? values.endTime : undefined,
    }),
    [values.leaveType, values.startDate, endDate, values.dayPart, values.startTime, values.endTime, isShort],
  );

  const datesReady = !!values.startDate && !!endDate && endDate >= values.startDate && (!isShort || (!!values.startTime && !!values.endTime));
  const periods = useAffectedPeriods(params, datesReady);

  const errors: Partial<Record<keyof LeaveFormValues, string>> = {};
  if (!values.reason.trim()) errors.reason = "Give a reason for the leave";
  if (!isShort && endDate < values.startDate) errors.endDate = "The last day cannot be before the first day";
  if (isShort && (!values.startTime || !values.endTime)) errors.startTime = "Give the time you leave and return";
  if (isShort && values.startTime && values.endTime && values.endTime <= values.startTime) errors.endTime = "Return time must be after the leaving time";

  const toRequest = (): ApplyLeaveRequest => ({
    leave_type: values.leaveType,
    start_date: values.startDate,
    end_date: endDate,
    day_part: isShort ? "full" : values.dayPart,
    start_time: isShort ? values.startTime : undefined,
    end_time: isShort ? values.endTime : undefined,
    reason: values.reason.trim(),
    acting_teacher_id: values.actingTeacherId || undefined,
    relief: (periods.data?.items ?? []).map((p) => ({
      date: p.date,
      period_number: p.period_number,
      class_id: p.class_id,
      subject_id: p.subject_id ?? undefined,
      relief_teacher_id: relief[periodKey(p)] || undefined,
    })),
  });

  const reset = () => {
    setValues(initial());
    setRelief({});
  };

  return {
    values, set, isShort, singleDay, errors, isValid: Object.keys(errors).length === 0,
    periods, relief, setRelief: (key: string, teacherId: string) => setRelief((prev) => ({ ...prev, [key]: teacherId })),
    toRequest, reset,
  };
}
