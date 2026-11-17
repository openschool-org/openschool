import { describe, expect, it } from "vitest";
import type { PromotionPreviewRow } from "@/features/academics/api/promotion";
import { commitEntries, countUnassigned, groupPromotionRows, seedAssignments } from "@/features/academics/lib/promotion";

const row = (id: string, next: string | null, extra: Partial<PromotionPreviewRow> = {}) =>
  ({
    student_id: id,
    next_grade_id: next,
    next_grade_name: next ? `Grade ${next}` : null,
    graduating: next === null,
    suggested_class_id: null,
    ...extra,
  }) as PromotionPreviewRow;

describe("promotion helpers", () => {
  const preview = [
    row("a", "11", { total_marks: 300, suggested_class_id: "c1" }),
    row("b", "11", { total_marks: 450 }),
    row("c", null),
    row("d", "12", { suggested_class_id: "c2" }),
  ];

  it("groups by next grade with graduates apart, and ranks by marks when asked", () => {
    const groups = groupPromotionRows(preview, true);
    expect(groups.map((g) => [g.gradeId, g.gradeName, g.rows.map((r) => r.student_id)])).toEqual([
      ["11", "Grade 11", ["b", "a"]],
      ["graduating", "Graduating (no next grade)", ["c"]],
      ["12", "Grade 12", ["d"]],
    ]);
    expect(groupPromotionRows(preview, false)[0].rows.map((r) => r.student_id)).toEqual(["a", "b"]);
  });

  it("seeds suggestions, counts the unassigned and drops blanks on commit", () => {
    const seeded = seedAssignments(preview);
    expect(seeded).toEqual({ a: "c1", d: "c2" });
    expect(countUnassigned(preview, seeded)).toBe(1);
    expect(commitEntries({ ...seeded, b: "" })).toEqual([
      { student_id: "a", class_id: "c1" },
      { student_id: "d", class_id: "c2" },
    ]);
  });
});
