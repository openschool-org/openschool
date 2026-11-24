import { describe, expect, it } from "vitest";
import { sharedBells } from "@/features/timetable/lib/sharedBells";
import type { TimetablePeriod } from "@/features/timetable/api/gradeSection";

const p = (n: number, start: string, end: string): TimetablePeriod => ({ id: `${n}${start}`, sort_order: n, period_number: n, start_time: start, end_time: end, slot_type: "period" });

describe("sharedBells", () => {
  it("returns the schedule when every class uses the same bells", () => {
    const a = [p(1, "07:50", "08:30")];
    expect(sharedBells([a, [p(1, "07:50", "08:30")]])).toBe(a);
  });

  it("returns nothing when the bells differ or one class has none", () => {
    expect(sharedBells([[p(1, "07:50", "08:30")], [p(1, "07:30", "08:10")]])).toBeUndefined();
    expect(sharedBells([[p(1, "07:50", "08:30")], undefined])).toBeUndefined();
    expect(sharedBells([])).toBeUndefined();
  });
});
