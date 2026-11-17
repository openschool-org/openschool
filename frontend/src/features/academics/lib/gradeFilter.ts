import type { Grade } from "@/features/academics/api/grade";
import type { ClassWithDetails } from "@/features/academics/api/class";
import { gradeBand } from "@/shared/lib/gradeBand";

export interface VisibleGrade {
  grade: Grade;
  index: number;
  classes: ClassWithDetails[];
}

// Search matches a class name, its form teacher, or the grade name (which then shows all its classes).
// The section filter keeps one school section ("all" keeps every grade).
export function filterGrades(
  orderedGrades: Grade[],
  classesByGrade: Map<string, ClassWithDetails[]>,
  query: string,
  section: string,
  teacherName: (id: string | null) => string | null | undefined,
): VisibleGrade[] {
  const q = query.trim().toLowerCase();
  const out: VisibleGrade[] = [];
  orderedGrades.forEach((grade, index) => {
    if (section !== "all" && gradeBand(grade.name) !== section) return;
    const all = classesByGrade.get(grade.id) ?? [];
    if (!q) {
      out.push({ grade, index, classes: all });
      return;
    }
    const matches = all.filter((c) => c.name.toLowerCase().includes(q) || (teacherName(c.form_teacher_id) ?? "").toLowerCase().includes(q));
    const nameMatch = grade.name.toLowerCase().includes(q);
    if (matches.length > 0) out.push({ grade, index, classes: matches });
    else if (nameMatch) out.push({ grade, index, classes: all });
  });
  return out;
}
