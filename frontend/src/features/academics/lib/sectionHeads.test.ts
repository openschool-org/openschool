import { describe, expect, it } from "vitest";
import type { ClassWithDetails } from "@/features/academics/api/class";
import { sectionHeadRows, sectionHeadsView } from "@/features/academics/lib/sectionHeads";

const cls = (grade: string, stream: string | null) => ({ grade_id: grade, grade_name: `Grade ${grade}`, stream_id: stream }) as ClassWithDetails;

describe("sectionHeadRows", () => {
  it("makes one slot per grade, split by stream where classes are streamed", () => {
    const rows = sectionHeadRows([cls("12", "sci"), cls("12", "art"), cls("9", null), cls("12", "sci")], [{ id: "sci", name: "Science" }, { id: "art", name: "Arts" }]);
    expect(rows.map((r) => r.key)).toEqual(["12-art", "12-sci", "9"]);
    expect(rows[0].streamName).toBe("Arts");
  });
});

describe("sectionHeadsView", () => {
  const ok = { isLoading: false, isError: false, hasData: true };
  it("walks the states in order", () => {
    expect(sectionHeadsView(false, ok, ok, ok, 3)).toBe("noYear");
    expect(sectionHeadsView(true, { ...ok, isLoading: true }, ok, ok, 3)).toBe("loading");
    expect(sectionHeadsView(true, { isLoading: false, isError: true, hasData: false }, ok, ok, 3)).toBe("headsError");
    expect(sectionHeadsView(true, ok, { ...ok, isLoading: true }, ok, 0)).toBe("loading");
    expect(sectionHeadsView(true, ok, { isLoading: false, isError: true, hasData: false }, ok, 0)).toBe("structureError");
    expect(sectionHeadsView(true, ok, ok, ok, 0)).toBe("empty");
    expect(sectionHeadsView(true, ok, ok, ok, 2)).toBe("rows");
  });

  it("keeps showing stale rows when a refresh fails", () => {
    expect(sectionHeadsView(true, { isLoading: false, isError: true, hasData: true }, ok, ok, 2)).toBe("rows");
  });
});
