import { describe, expect, it } from "vitest";
import type { Subject } from "@/features/curriculum/api/subject";
import type { Teacher } from "@/features/teachers/api/teacher";
import type { TimetableEntry } from "@/features/timetable/api/timetable";
import { subjectsForClass, withCellTeacher } from "@/features/timetable/lib/editorLists";

const subjects = [{ id: "phy" }, { id: "art" }] as Subject[];

describe("timetable editor lists", () => {
  it("limits A-Level classes to their assigned subjects", () => {
    expect(subjectsForClass(subjects, ["phy"], "Grade 12").map((s) => s.id)).toEqual(["phy"]);
    expect(subjectsForClass(subjects, ["phy"], "Grade 9")).toBe(subjects);
  });

  it("adds the cell's current teacher when the search did not return them", () => {
    const found = [{ id: "t2", full_name: "B" }] as Teacher[];
    const entry = { teacher_id: "t1", teacher_name: "A" } as TimetableEntry;
    expect(withCellTeacher(found, entry).map((t) => t.id)).toEqual(["t1", "t2"]);
    expect(withCellTeacher(found, { teacher_id: "t2", teacher_name: "B" } as TimetableEntry)).toBe(found);
    expect(withCellTeacher(found, undefined)).toBe(found);
  });
});
