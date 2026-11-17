import { describe, expect, it } from "vitest";
import type { ClassWithDetails } from "@/features/academics/api/class";
import type { TeacherWorkloadRow } from "@/features/teachers/api/teacher";
import { mergeMyClasses } from "@/features/teachers/queries/useTeachers";

const cls = (id: string, formTeacher: string | null, students: number) =>
  ({ id, name: `10-${id}`, grade_name: "Grade 10", form_teacher_id: formTeacher, student_count: students }) as ClassWithDetails;

const load = (classId: string, subject: string, current = true) =>
  ({ class_id: classId, class_name: `10-${classId}`, grade_name: "Grade 10", subject_name: subject, academic_year_is_current: current }) as TeacherWorkloadRow;

describe("mergeMyClasses", () => {
  it("lists form classes first, then adds subject classes with their student counts", () => {
    const classes = [cls("A", "t1", 30), cls("B", null, 28), cls("C", "t2", 25)];
    const rows = mergeMyClasses("t1", classes, [load("A", "Maths"), load("B", "Science"), load("A", "Maths")]);
    expect(rows).toEqual([
      { class_id: "A", class_name: "10-A", grade_name: "Grade 10", subjects: ["Maths"], isFormTeacher: true, studentCount: 30 },
      { class_id: "B", class_name: "10-B", grade_name: "Grade 10", subjects: ["Science"], isFormTeacher: false, studentCount: 28 },
    ]);
  });

  it("ignores workload from other years", () => {
    expect(mergeMyClasses("t1", [], [load("A", "Maths", false)])).toEqual([]);
  });
});
