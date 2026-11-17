import { useState } from "react";
import type { ClassMarkRow } from "@/features/marks/api/termMark";
import { useTerms, useCurrentTerm } from "@/features/school/queries/useTerms";
import { useSubjects } from "@/features/curriculum/queries/useSubjects";
import { useClassSubjectTeachers } from "@/features/academics/queries/useClasses";
import { useClassMarks, useSaveClassMarks } from "@/features/marks/queries/useTermMarks";

export interface ClassMarkEntry {
  marks: number;
  max_marks: number;
  is_absent: boolean;
}

export function seedClassMarks(rows: ClassMarkRow[], defaultMaxMarks: number): Record<string, ClassMarkEntry> {
  return Object.fromEntries(
    rows.map((r) => [r.student_id, { marks: r.marks ?? 0, max_marks: r.max_marks ?? defaultMaxMarks, is_absent: r.is_absent ?? false }]),
  );
}

// Term and subject picker, the editable marks for that pair, and saving them, for the admin class page.
export function useClassMarksEntry(classId: string, academicYearId: string) {
  const { data: terms } = useTerms(academicYearId);
  const { data: currentTerm } = useCurrentTerm();
  const { data: subjects } = useSubjects();
  // Scoped to subjects actually assigned to this class, not every subject in the school.
  const { data: classSubjectTeachers } = useClassSubjectTeachers(classId);

  const [termId, setTermId] = useState("");
  const [termTouched, setTermTouched] = useState(false);
  const [subjectId, setSubjectId] = useState("");
  // Auto-selects the current term once it loads, unless the admin already picked one (e.g. a past term).
  const effectiveTermId = termTouched ? termId : termId || currentTerm?.id || "";

  const { data: rows, isLoading } = useClassMarks(classId, effectiveTermId, subjectId);
  const saveMarks = useSaveClassMarks(classId);

  // Draft edits keyed by student_id, reseeded whenever the term/subject selection changes.
  const [draft, setDraft] = useState<Record<string, ClassMarkEntry>>({});
  const [syncedFor, setSyncedFor] = useState("");
  const rowsKey = `${effectiveTermId}:${subjectId}`;
  const defaultMaxMarks = subjects?.find((s) => s.id === subjectId)?.max_marks ?? 100;
  if (rows && syncedFor !== rowsKey) {
    setDraft(seedClassMarks(rows, defaultMaxMarks));
    setSyncedFor(rowsKey);
  }

  const save = () => {
    if (!effectiveTermId || !subjectId) return;
    saveMarks.mutate({
      term_id: effectiveTermId,
      subject_id: subjectId,
      entries: Object.entries(draft).map(([student_id, v]) => ({ student_id, ...v })),
    });
  };

  return {
    terms: terms ?? [],
    classSubjects: classSubjectTeachers?.map((st) => ({ id: st.subject_id, name: st.subject_name })) ?? [],
    termId: effectiveTermId,
    pickTerm: (v: string) => {
      setTermId(v);
      setTermTouched(true);
    },
    subjectId,
    setSubjectId,
    rows,
    isLoading,
    draft,
    update: (studentId: string, patch: Partial<ClassMarkEntry>) => setDraft((d) => ({ ...d, [studentId]: { ...d[studentId], ...patch } })),
    saveMarks,
    save,
  };
}
