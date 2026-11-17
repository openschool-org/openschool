import { describe, expect, it } from "vitest";
import { enrollmentPicks, isCompulsory, presetLevel, seedPicks } from "@/features/students/lib/enrollmentPicks";

const core = { id: "core", min_select: 2, max_select: 2, subjects: [{ subject_id: "maths" }, { subject_id: "sci" }] };
const basket = { id: "b1", min_select: 1, max_select: 1, subjects: [{ subject_id: "art", medium_id: "si" }, { subject_id: "music" }] };

describe("enrollment picks", () => {
  it("treats a take-all group as compulsory", () => {
    expect(isCompulsory(core)).toBe(true);
    expect(isCompulsory(basket)).toBe(false);
  });

  it("presets the saved level, else the grade's level, else waits for data", () => {
    const saved = [{ level_id: "L1", group_id: "b1", subject_id: "art" }];
    expect(presetLevel(saved, undefined, undefined, undefined, false)).toBe("L1");
    expect(presetLevel([], undefined, undefined, "Grade 10", true)).toBeNull();
    const levels = [{ id: "L10", grade_id: "g10" }];
    const grades = [{ id: "g10", name: "Grade 10" }];
    expect(presetLevel([], levels, grades, "Grade 10", true)).toBe("L10");
    expect(presetLevel([], levels, grades, "Grade 11", true)).toBe("");
  });

  it("seeds saved picks and fills compulsory groups", () => {
    const saved = [{ level_id: "L1", group_id: "b1", subject_id: "art" }, { level_id: "L2", group_id: "x", subject_id: "y" }];
    expect(seedPicks(saved, "L1", [core, basket])).toEqual({ b1: ["art"], core: ["maths", "sci"] });
  });

  it("sends each pick with the group's medium", () => {
    expect(enrollmentPicks([core, basket], { b1: ["art"], core: ["maths"] })).toEqual([
      { group_id: "core", subject_id: "maths", medium_id: undefined },
      { group_id: "b1", subject_id: "art", medium_id: "si" },
    ]);
  });
});
