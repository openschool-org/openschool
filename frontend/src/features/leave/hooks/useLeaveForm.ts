import { useMemo, useState } from "react";
import type { AffectedPeriod, ApplyLeaveRequest } from "@/features/leave/api/leave";
import { useAffectedPeriods } from "@/features/leave/queries/useLeave";
import { todayISODate } from "@/shared/lib/date";
import { datesReady, effectiveEndDate, isSingleDay, leaveFormErrors, periodsParams, withChange, type LeaveFormValues } from "@/features/leave/lib/leaveForm";

export type { LeaveFormValues } from "@/features/leave/lib/leaveForm";

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

  // Changing the type or dates changes which periods are missed, so stale picks are dropped.
  const set = <K extends keyof LeaveFormValues>(key: K, value: LeaveFormValues[K]) => {
    setValues((prev) => withChange(prev, key, value));
    if (key !== "reason" && key !== "actingTeacherId") setRelief({});
  };

  const params = useMemo(() => periodsParams(values), [values]);
  const ready = datesReady(values);
  const periods = useAffectedPeriods(params, ready);
  const errors = leaveFormErrors(values);

  const toRequest = (): ApplyLeaveRequest => ({
    leave_type: values.leaveType,
    start_date: values.startDate,
    end_date: effectiveEndDate(values),
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
    values, set, isShort, singleDay: isSingleDay(values), errors,
    isValid: Object.keys(errors).length === 0 && (!ready || (periods.isSuccess && !periods.isFetching)),
    periods, relief, setRelief: (key: string, teacherId: string) => setRelief((prev) => ({ ...prev, [key]: teacherId })),
    toRequest, reset,
  };
}
