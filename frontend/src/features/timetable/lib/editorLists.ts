import type { Subject } from "@/features/curriculum/api/subject";
import type { Teacher } from "@/features/teachers/api/teacher";
import type { TimetableEntry } from "@/features/timetable/api/timetable";

// A-Level classes only pick from the subjects assigned to the class.
export function subjectsForClass(subjects: Subject[], assignedIds: string[], gradeName: string): Subject[] {
  if (!/12|13/.test(gradeName)) return subjects;
  const assigned = new Set(assignedIds);
  return subjects.filter((s) => assigned.has(s.id));
}

// The cell's current teacher may not be in the search results (e.g. nothing typed yet), so it is added
// from the entry's own name; employee_number is unknown here, so it is left blank.
export function withCellTeacher(teachers: Teacher[], existing: TimetableEntry | undefined): Teacher[] {
  if (existing?.teacher_id && existing.teacher_name && !teachers.some((t) => t.id === existing.teacher_id)) {
    return [{ id: existing.teacher_id, full_name: existing.teacher_name, employee_number: "" } as Teacher, ...teachers];
  }
  return teachers;
}
