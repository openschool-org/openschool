import { describe, expect, it } from "vitest";
import type { Grade } from "@/features/academics/api/grade";
import type { ClassWithDetails } from "@/features/academics/api/class";
import { filterGrades } from "@/features/academics/lib/gradeFilter";

const g6 = { id: "g6", name: "Grade 6" } as Grade;
const g12 = { id: "g12", name: "Grade 12" } as Grade;
const cls = (id: string, name: string, teacher: string | null) => ({ id, name, form_teacher_id: teacher }) as ClassWithDetails;
const byGrade = new Map([
  ["g6", [cls("a", "6A", "t1"), cls("b", "6B", null)]],
  ["g12", [cls("c", "12 Science", "t2")]],
]);
const teacherName = (id: string | null) => ({ t1: "Mrs Silva", t2: "Mr Fernando" })[id ?? ""];
const ids = (rows: ReturnType<typeof filterGrades>) => rows.map((r) => [r.grade.id, r.index, r.classes.map((c) => c.id)]);

describe("filterGrades", () => {
  it("keeps everything with no search and no section", () => {
    expect(ids(filterGrades([g6, g12], byGrade, "", "all", teacherName))).toEqual([["g6", 0, ["a", "b"]], ["g12", 1, ["c"]]]);
  });

  it("matches class names and form teachers", () => {
    expect(ids(filterGrades([g6, g12], byGrade, "6b", "all", teacherName))).toEqual([["g6", 0, ["b"]]]);
    expect(ids(filterGrades([g6, g12], byGrade, "silva", "all", teacherName))).toEqual([["g6", 0, ["a"]]]);
  });

  it("shows every class of a grade whose name matches", () => {
    expect(ids(filterGrades([g6, g12], byGrade, "grade 12", "all", teacherName))).toEqual([["g12", 1, ["c"]]]);
  });

  it("filters by school section and keeps the original index", () => {
    expect(ids(filterGrades([g6, g12], byGrade, "", "al", teacherName))).toEqual([["g12", 1, ["c"]]]);
  });
});
