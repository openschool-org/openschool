import type { AssignmentEntry, PromotionPreviewRow } from "@/features/academics/api/promotion";

export interface PromotionGradeGroup {
  gradeId: string;
  gradeName: string;
  rows: PromotionPreviewRow[];
}

// Groups preview rows by next grade, with graduating students in their own group.
export function groupPromotionRows(preview: PromotionPreviewRow[], rankByMarks: boolean): PromotionGradeGroup[] {
  const byGrade = new Map<string, PromotionGradeGroup>();
  for (const row of preview) {
    const gradeId = row.graduating ? "graduating" : row.next_grade_id!;
    const gradeName = row.graduating ? "Graduating (no next grade)" : row.next_grade_name!;
    if (!byGrade.has(gradeId)) byGrade.set(gradeId, { gradeId, gradeName, rows: [] });
    byGrade.get(gradeId)!.rows.push(row);
  }
  const list = [...byGrade.values()];
  if (rankByMarks) {
    for (const g of list) g.rows.sort((a, b) => (b.total_marks ?? -1) - (a.total_marks ?? -1));
  }
  return list;
}

// Starts each student in the class the server suggested.
export function seedAssignments(preview: PromotionPreviewRow[]): Record<string, string> {
  const seeded: Record<string, string> = {};
  for (const row of preview) {
    if (row.suggested_class_id) seeded[row.student_id] = row.suggested_class_id;
  }
  return seeded;
}

export function commitEntries(assignments: Record<string, string>): AssignmentEntry[] {
  return Object.entries(assignments)
    .filter(([, classId]) => !!classId)
    .map(([studentId, classId]) => ({ student_id: studentId, class_id: classId }));
}

// Students moving up who still have no target class.
export function countUnassigned(preview: PromotionPreviewRow[], assignments: Record<string, string>): number {
  return preview.filter((r) => !r.graduating && !assignments[r.student_id]).length;
}
