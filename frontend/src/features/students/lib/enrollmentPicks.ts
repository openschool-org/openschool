import type { EnrollmentPick } from "@/features/students/api/enrollment";

interface Group {
  id: string;
  min_select: number;
  max_select: number;
  subjects: { subject_id: string; medium_id?: string | null }[];
}

interface SavedEnrollment {
  level_id: string;
  group_id: string;
  subject_id: string;
}

// A group where every subject must be taken behaves as a fixed block.
export function isCompulsory(g: Group) {
  return g.subjects.length > 0 && g.min_select === g.subjects.length && g.max_select === g.subjects.length;
}

// The level to open with: an existing enrolment wins, else the level linked to the student's grade.
// Returns null while the data needed to decide is still loading.
export function presetLevel(
  enrollments: SavedEnrollment[],
  levels: { id: string; grade_id: string | null }[] | undefined,
  grades: { id: string; name: string }[] | undefined,
  studentGrade: string | undefined | null,
  hasStudent: boolean,
): string | null {
  if (enrollments.length > 0) return enrollments[0].level_id;
  if (!levels || !grades || !hasStudent) return null;
  const gradeId = grades.find((g) => g.name === studentGrade)?.id;
  return (gradeId ? levels.find((l) => l.grade_id === gradeId)?.id : undefined) ?? "";
}

// Saved picks for the level, with compulsory groups filled in.
export function seedPicks(enrollments: SavedEnrollment[], levelId: string, groups: Group[]): Record<string, string[]> {
  const map: Record<string, string[]> = {};
  for (const e of enrollments) if (e.level_id === levelId) (map[e.group_id] ??= []).push(e.subject_id);
  for (const g of groups) if (isCompulsory(g) && !map[g.id]?.length) map[g.id] = g.subjects.map((s) => s.subject_id);
  return map;
}

// Picks to submit, each carrying the medium the group offers that subject in.
export function enrollmentPicks(groups: Group[], selected: Record<string, string[]>): EnrollmentPick[] {
  return groups.flatMap((g) =>
    (selected[g.id] ?? []).map((subjectId) => ({
      group_id: g.id,
      subject_id: subjectId,
      medium_id: g.subjects.find((s) => s.subject_id === subjectId)?.medium_id ?? undefined,
    })),
  );
}
