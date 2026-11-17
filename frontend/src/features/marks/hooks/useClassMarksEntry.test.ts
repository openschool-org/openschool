import { describe, expect, it } from "vitest";
import type { ClassMarkRow } from "@/features/marks/api/termMark";
import { seedClassMarks } from "@/features/marks/hooks/useClassMarksEntry";

describe("seedClassMarks", () => {
  it("fills blanks with zero marks, the subject's maximum and present", () => {
    const rows = [
      { student_id: "a", marks: 72, max_marks: 80, is_absent: false },
      { student_id: "b", marks: null, max_marks: null, is_absent: null },
    ] as unknown as ClassMarkRow[];
    expect(seedClassMarks(rows, 100)).toEqual({
      a: { marks: 72, max_marks: 80, is_absent: false },
      b: { marks: 0, max_marks: 100, is_absent: false },
    });
  });
});
