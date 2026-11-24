import { describe, expect, it } from "vitest";
import { formatTimeRange } from "@/shared/lib/timetable";

describe("formatTimeRange", () => {
  it("prints school times with dots and one a.m. or p.m.", () => {
    expect(formatTimeRange("07:30", "08:15")).toBe("07.30-08.15 a.m.");
    expect(formatTimeRange("12:50:00", "13:30:00")).toBe("12.50-01.30 p.m.");
  });

  it("names both halves when a slot crosses noon", () => {
    expect(formatTimeRange("11:30", "12:10")).toBe("11.30 a.m.-12.10 p.m.");
  });
});
