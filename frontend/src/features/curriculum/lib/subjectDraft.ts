import type { GroupSubject, Medium } from "@/features/curriculum/api/curriculum";
import type { Subject } from "@/features/curriculum/api/subject";
import type { SubjectForm } from "@/features/curriculum/components/AddSubjectModal";

// What saving a group's staged subjects must remove and add, compared by subject id.
export function subjectDiff(original: GroupSubject[], next: GroupSubject[]) {
  const nextIds = new Set(next.map((s) => s.subject_id));
  const originalIds = new Set(original.map((s) => s.subject_id));
  return {
    remove: original.filter((s) => !nextIds.has(s.subject_id)),
    add: next.filter((s) => !originalIds.has(s.subject_id)),
  };
}

// Max existing + 1, not length, so a gap from a deleted subject doesn't hand out a colliding sort_order.
export function nextSortOrder(subjects: GroupSubject[]): number {
  return subjects.reduce((max, s) => Math.max(max, s.sort_order), -1) + 1;
}

export function stagedSubject(subject: Subject, medium: Medium | undefined, form: SubjectForm): GroupSubject {
  return {
    subject_id: subject.id,
    subject_name: subject.name,
    subject_code: subject.code,
    subject_type: subject.type,
    medium_id: medium?.id ?? null,
    medium_name: medium?.name ?? null,
    prerequisite_note: form.prerequisite_note.trim() || null,
    sort_order: form.sort_order,
  };
}
