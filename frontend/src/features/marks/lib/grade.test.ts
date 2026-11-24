import { describe, expect, it } from "vitest";
import { averagePercent, gradeLetter, markPercent } from "@/features/marks/lib/grade";

describe("gradeLetter", () => {
  it("uses the Sri Lankan grade boundaries", () => {
    expect([100, 75, 74.9, 65, 50, 49, 35, 34].map(gradeLetter)).toEqual(["A", "A", "B", "B", "C", "S", "S", "F"]);
  });
});

describe("markPercent and averagePercent", () => {
  it("scales by max marks and skips absent marks", () => {
    expect(markPercent({ marks: 41, max_marks: 50, is_absent: false })).toBe(82);
    expect(markPercent({ marks: "82.00", max_marks: "100.00", is_absent: false })).toBe(82);
    expect(markPercent({ marks: 0, max_marks: 100, is_absent: true })).toBeNull();
    expect(
      averagePercent([
        { marks: 80, max_marks: 100, is_absent: false },
        { marks: 60, max_marks: 100, is_absent: false },
        { marks: 0, max_marks: 100, is_absent: true },
      ]),
    ).toBe(70);
    expect(averagePercent([])).toBeNull();
  });
});
