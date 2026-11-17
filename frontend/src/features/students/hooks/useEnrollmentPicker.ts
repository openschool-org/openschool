import { useState } from "react";
import { useCurrentAcademicYear } from "@/features/school/queries/useAcademicYears";
import { useLevels, useLevelTree } from "@/features/curriculum/queries/useCurriculum";
import { useStudentWithClass } from "@/features/students/queries/useStudents";
import { useGrades } from "@/features/academics/queries/useGrades";
import { useStudentEnrollments, useSubmitEnrollments } from "@/features/students/queries/useEnrollments";
import { enrollmentPicks, presetLevel, seedPicks } from "@/features/students/lib/enrollmentPicks";

// Level preselection, per-group subject picks and submission for one student's enrolment.
export function useEnrollmentPicker(studentId: string) {
  const { data: currentYear } = useCurrentAcademicYear();
  const academicYearId = currentYear?.id ?? "";
  const { data: levels } = useLevels();
  const { data: student } = useStudentWithClass(studentId);
  const { data: grades } = useGrades();
  const { data: enrollments } = useStudentEnrollments(studentId, academicYearId);

  const [selectedLevel, setSelectedLevel] = useState("");
  const [presetDone, setPresetDone] = useState(false);
  const [syncedFor, setSyncedFor] = useState<string | null>(null);
  const [selected, setSelected] = useState<Record<string, string[]>>({});

  const { data: tree, isLoading: treeLoading } = useLevelTree(selectedLevel);
  const submit = useSubmitEnrollments(studentId, academicYearId);

  // Preselect once: an existing enrolment wins, else the level for the student's grade.
  if (!presetDone && enrollments) {
    const level = presetLevel(enrollments, levels, grades, student?.grade_name, !!student);
    if (level !== null) {
      if (level) setSelectedLevel(level);
      setPresetDone(true);
    }
  }

  // Seed picks from saved enrolments when the tree for the chosen level arrives.
  if (enrollments && tree && tree.level.id === selectedLevel && syncedFor !== selectedLevel) {
    setSelected(seedPicks(enrollments, selectedLevel, tree.groups));
    setSyncedFor(selectedLevel);
  }

  const changeLevel = (id: string) => {
    submit.reset();
    setSyncedFor(null);
    setSelectedLevel(id);
    if (!id) setSelected({});
  };

  const toggle = (groupId: string, subjectId: string, checked: boolean) =>
    setSelected((prev) => {
      const cur = prev[groupId] ?? [];
      return { ...prev, [groupId]: checked ? [...cur, subjectId] : cur.filter((s) => s !== subjectId) };
    });

  const save = () => {
    if (!tree) return;
    submit.mutate({ academic_year_id: academicYearId, level_id: selectedLevel, picks: enrollmentPicks(tree.groups, selected) });
  };

  return { currentYear, academicYearId, levels, selectedLevel, changeLevel, tree, treeLoading, selected, toggle, submit, save };
}
