import { describe, expect, it } from "vitest";
import type { Student } from "@/features/students/api/student";
import { matchesStudent } from "@/features/attendance/hooks/useAttendanceMarkPage";

const st = { full_name: "Kamal Perera", name_with_initials: "K. Perera", index_number: "2026/0145" } as Student;

describe("matchesStudent", () => {
  it("matches full name, initials or index, ignoring case and spaces", () => {
    expect(matchesStudent(st, " kamal ")).toBe(true);
    expect(matchesStudent(st, "k. per")).toBe(true);
    expect(matchesStudent(st, "0145")).toBe(true);
    expect(matchesStudent(st, "nimal")).toBe(false);
    expect(matchesStudent(st, "")).toBe(true);
  });
});
