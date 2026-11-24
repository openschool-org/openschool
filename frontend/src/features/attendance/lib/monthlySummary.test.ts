import { describe, expect, it } from "vitest";
import { summariseByMonth } from "@/features/attendance/lib/monthlySummary";

describe("summariseByMonth", () => {
  it("counts each status per month, newest month first", () => {
    const result = summariseByMonth([
      { session_date: "2026-10-30", status: "present" },
      { session_date: "2026-11-02", status: "present" },
      { session_date: "2026-11-03", status: "late" },
      { session_date: "2026-11-04", status: "absent" },
      { session_date: "2026-11-05", status: "excused" },
    ]);
    expect(result.map((m) => m.month)).toEqual(["2026-11", "2026-10"]);
    expect(result[0]).toMatchObject({ days: 4, present: 1, late: 1, absent: 1, excused: 1, rate: 50 });
    expect(result[1]).toMatchObject({ days: 1, rate: 100 });
  });

  it("returns nothing for no records", () => {
    expect(summariseByMonth([])).toEqual([]);
  });
});
