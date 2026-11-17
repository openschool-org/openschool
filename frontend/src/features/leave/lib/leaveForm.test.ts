import { describe, expect, it } from "vitest";
import { datesReady, leaveFormErrors, periodsParams, withChange, type LeaveFormValues } from "@/features/leave/lib/leaveForm";

const base: LeaveFormValues = {
  leaveType: "casual", startDate: "2026-11-17", endDate: "2026-11-19", dayPart: "full",
  startTime: "", endTime: "", reason: "Medical", actingTeacherId: "",
};

describe("leave form rules", () => {
  it("resets to a full day for types without half days, and pins one-day leave", () => {
    const half = withChange(base, "dayPart", "morning");
    expect(half.endDate).toBe("2026-11-17");
    expect(withChange(half, "leaveType", "sick").dayPart).toBe("full");
    expect(withChange(base, "startDate", "2026-11-25").endDate).toBe("2026-11-25");
  });

  it("asks short leave for the period by time, not day part", () => {
    const short = { ...base, leaveType: "short" as const, startTime: "09:00", endTime: "11:00" };
    expect(periodsParams(short)).toEqual({ leave_type: "short", start_date: "2026-11-17", end_date: "2026-11-17", day_part: undefined, start_time: "09:00", end_time: "11:00" });
    expect(datesReady(short)).toBe(true);
    expect(datesReady({ ...short, endTime: "" })).toBe(false);
  });

  it("reports missing reason and bad times", () => {
    expect(leaveFormErrors({ ...base, reason: " " })).toEqual({ reason: "Give a reason for the leave" });
    expect(leaveFormErrors({ ...base, leaveType: "short", startTime: "11:00", endTime: "10:00" })).toEqual({ endTime: "Return time must be after the leaving time" });
    expect(leaveFormErrors({ ...base, endDate: "2026-11-10" }).endDate).toBe("The last day cannot be before the first day");
  });
});
