import { describe, expect, it } from "vitest";
import type { GroupSubject } from "@/features/curriculum/api/curriculum";
import type { Subject } from "@/features/curriculum/api/subject";
import { nextSortOrder, stagedSubject, subjectDiff } from "@/features/curriculum/lib/subjectDraft";

const gs = (id: string, sort = 0) => ({ subject_id: id, sort_order: sort }) as GroupSubject;

describe("subject draft helpers", () => {
  it("diffs staged subjects against the saved ones", () => {
    const { remove, add } = subjectDiff([gs("a"), gs("b")], [gs("b"), gs("c")]);
    expect(remove.map((s) => s.subject_id)).toEqual(["a"]);
    expect(add.map((s) => s.subject_id)).toEqual(["c"]);
  });

  it("picks the next sort order after the highest, not the count", () => {
    expect(nextSortOrder([])).toBe(0);
    expect(nextSortOrder([gs("a", 0), gs("b", 5)])).toBe(6);
  });

  it("stages a subject with a trimmed note and optional medium", () => {
    const subject = { id: "s1", name: "Physics", code: "PHY", type: "core" } as Subject;
    const staged = stagedSubject(subject, undefined, { subject_id: "s1", medium_id: "", prerequisite_note: "  ", sort_order: 3 });
    expect(staged).toEqual({
      subject_id: "s1", subject_name: "Physics", subject_code: "PHY", subject_type: "core",
      medium_id: null, medium_name: null, prerequisite_note: null, sort_order: 3,
    });
  });
});
