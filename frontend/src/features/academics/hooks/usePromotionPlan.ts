import { useMemo, useState } from "react";
import { useAcademicYears } from "@/features/school/queries/useAcademicYears";
import { useTerms } from "@/features/school/queries/useTerms";
import { useClassesByAcademicYear } from "@/features/academics/queries/useClasses";
import { usePromotionPreview, useCommitAssignments } from "@/features/academics/queries/usePromotion";
import { commitEntries, countUnassigned, groupPromotionRows, seedAssignments } from "@/features/academics/lib/promotion";

// State for the promotion page: which years, the preview, and each student's chosen class.
export function usePromotionPlan() {
  const { data: years, isLoading: yearsLoading } = useAcademicYears();
  const currentYear = years?.find((y) => y.is_current);

  const [sourceYearId, setSourceYearId] = useState("");
  const [targetYearId, setTargetYearId] = useState("");
  const [termId, setTermId] = useState("");
  const [rankByMarks, setRankByMarks] = useState(false);

  const effectiveSourceYearId = sourceYearId || currentYear?.id || "";
  // Excludes the current year and the chosen source year, promoting into the same year isn't a valid target.
  const otherYears = (years ?? []).filter((y) => !y.is_current && y.id !== effectiveSourceYearId);

  const { data: terms } = useTerms(effectiveSourceYearId);
  const { data: targetClasses } = useClassesByAcademicYear(targetYearId);
  const preview = usePromotionPreview(effectiveSourceYearId, targetYearId, rankByMarks ? termId : undefined);
  const commit = useCommitAssignments();

  // student_id -> chosen target class_id; seeded from suggested_class_id per preview, then freely overridable.
  const [assignments, setAssignments] = useState<Record<string, string>>({});
  const [seededFor, setSeededFor] = useState<string | null>(null);
  const previewKey = `${effectiveSourceYearId}|${targetYearId}`;
  if (preview.data && seededFor !== previewKey) {
    setAssignments(seedAssignments(preview.data));
    setSeededFor(previewKey);
  }

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const toggleSelected = (studentId: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(studentId)) next.delete(studentId);
      else next.add(studentId);
      return next;
    });

  const groups = useMemo(() => groupPromotionRows(preview.data ?? [], rankByMarks), [preview.data, rankByMarks]);

  const changeSource = (nextSourceYearId: string) => {
    setSourceYearId(nextSourceYearId);
    // Clear a target year that now matches the new source, so preview never runs with identical source/target.
    if (targetYearId && targetYearId === (nextSourceYearId || currentYear?.id)) setTargetYearId("");
  };

  const save = () => {
    if (!targetYearId || targetYearId === effectiveSourceYearId) return;
    const entries = commitEntries(assignments);
    if (entries.length === 0) return;
    commit.mutate({ academic_year_id: targetYearId, assignments: entries }, { onSuccess: () => setSelected(new Set()) });
  };

  return {
    years: years ?? [],
    yearsLoading,
    currentYear,
    otherYears,
    terms: terms ?? [],
    targetClasses: targetClasses ?? [],
    sourceYearId: effectiveSourceYearId,
    targetYearId,
    termId,
    rankByMarks,
    changeSource,
    setTargetYearId,
    setTermId,
    setRankByMarks,
    preview,
    groups,
    assignments,
    assign: (studentId: string, classId: string) => setAssignments((a) => ({ ...a, [studentId]: classId })),
    bulkAssign: (map: Record<string, string>) => setAssignments((a) => ({ ...a, ...map })),
    selected,
    toggleSelected,
    unassignedCount: countUnassigned(preview.data ?? [], assignments),
    readyToCommit: Object.keys(assignments).length > 0,
    commit,
    save,
  };
}

export type PromotionPlan = ReturnType<typeof usePromotionPlan>;
