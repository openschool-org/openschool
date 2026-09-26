import { useMemo, useState } from "react";
import { useQueries } from "@tanstack/react-query";
import { useCurrentClasses, useDeleteClass, useStreams } from "@/features/academics/queries/useClasses";
import { useGrades, useCreateGrade, useUpdateGrade, useDeleteGrade, useReorderGrades } from "@/features/academics/queries/useGrades";
import { teacherDetailOptions } from "@/features/teachers/queries/useTeachers";
import { useSchool } from "@/features/school/queries/useSchool";
import type { Grade } from "@/features/academics/api/grade";
import type { ClassWithDetails } from "@/features/academics/api/class";

// Data, derived views and grade-form state for the Grades & Classes page.
export function useGradesPage() {
  const grades = useGrades();
  const classes = useCurrentClasses();
  const { data: streams } = useStreams();
  const { data: school } = useSchool();

  // teacherName below is a name-lookup by id (each class's form_teacher_id),
  // not a picker - a capped /teachers page can't be used as a directory
  // (docs/SECURITY_AND_PERFORMANCE_PLAYBOOK.md section 4), so every distinct
  // referenced id is resolved individually instead.
  const formTeacherIds = useMemo(
    () => [...new Set((classes.data ?? []).map((c) => c.form_teacher_id).filter((id): id is string => !!id))],
    [classes.data],
  );
  const teacherQueries = useQueries({ queries: formTeacherIds.map((id) => teacherDetailOptions(id)) });
  const teacherNameById = useMemo(() => {
    const map = new Map<string, string>();
    teacherQueries.forEach((q, i) => { if (q.data) map.set(formTeacherIds[i], q.data.full_name); });
    return map;
  }, [teacherQueries, formTeacherIds]);

  const createGrade = useCreateGrade();
  const updateGrade = useUpdateGrade();
  const deleteGrade = useDeleteGrade();
  const reorder = useReorderGrades();
  const deleteClass = useDeleteClass();

  const [gradeModal, setGradeModal] = useState<"create" | "edit" | null>(null);
  const [editingGrade, setEditingGrade] = useState<Grade | null>(null);
  const [gradeName, setGradeName] = useState("");
  const [gradeNameTouched, setGradeNameTouched] = useState(false);

  const orderedGrades = useMemo(
    () => [...(grades.data ?? [])].sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name)),
    [grades.data],
  );

  const classesByGrade = useMemo(() => {
    const map = new Map<string, ClassWithDetails[]>();
    for (const c of classes.data ?? []) map.set(c.grade_id, [...(map.get(c.grade_id) ?? []), c]);
    for (const list of map.values()) list.sort((a, b) => a.name.localeCompare(b.name));
    return map;
  }, [classes.data]);

  const duplicateCount = useMemo(() => {
    const seen = new Map<number, number>();
    orderedGrades.forEach((g) => seen.set(g.sort_order, (seen.get(g.sort_order) ?? 0) + 1));
    return [...seen.values()].filter((n) => n > 1).reduce((a, b) => a + b, 0);
  }, [orderedGrades]);

  const move = (index: number, direction: -1 | 1) => {
    const next = [...orderedGrades];
    const target = index + direction;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    reorder.mutate(next);
  };

  const openCreateGrade = () => {
    createGrade.reset();
    setGradeName("");
    setGradeNameTouched(false);
    setEditingGrade(null);
    setGradeModal("create");
  };

  const openEditGrade = (g: Grade) => {
    updateGrade.reset();
    setGradeName(g.name);
    setGradeNameTouched(false);
    setEditingGrade(g);
    setGradeModal("edit");
  };

  const saveGrade = () => {
    setGradeNameTouched(true);
    const name = gradeName.trim();
    if (!name) return;
    const close = { onSuccess: () => setGradeModal(null) };
    if (gradeModal === "create") createGrade.mutate({ name, sort_order: orderedGrades.length }, close);
    else if (editingGrade) updateGrade.mutate({ id: editingGrade.id, data: { name, sort_order: editingGrade.sort_order } }, close);
  };

  return {
    grades,
    classes,
    orderedGrades,
    classesByGrade,
    duplicateCount,
    needsRenumber: orderedGrades.some((g, i) => g.sort_order !== i),
    range: { from: school?.grade_from ?? null, to: school?.grade_to ?? null },
    streamName: (id: string | null) => (id ? (streams?.find((s) => s.id === id)?.name ?? null) : null),
    teacherName: (id: string | null) => (id ? (teacherNameById.get(id) ?? null) : null),
    mutations: { createGrade, updateGrade, deleteGrade, reorder, deleteClass },
    form: { gradeModal, gradeName, gradeNameTouched, setGradeName, setGradeNameTouched, closeModal: () => setGradeModal(null) },
    move,
    openCreateGrade,
    openEditGrade,
    saveGrade,
  };
}
