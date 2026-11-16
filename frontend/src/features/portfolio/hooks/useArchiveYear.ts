import { useState } from "react";
import { useAcademicYears, useCurrentAcademicYear } from "@/features/school/queries/useAcademicYears";

// Year picker state for pages that show the current year and read-only past years.
// pastYears are the years with records; the current year is always offered.
export function useArchiveYear(pastYears: { id: string }[] | undefined) {
  const { data: currentYear, isLoading: yearLoading } = useCurrentAcademicYear();
  const { data: allYears } = useAcademicYears();
  const [selectedYearId, setSelectedYearId] = useState<string | null>(null);
  const viewingYearId = selectedYearId ?? currentYear?.id ?? "";
  const isArchive = !!currentYear && viewingYearId !== currentYear.id;

  const yearById = new Map((allYears ?? []).map((y) => [y.id, y]));
  const ids = new Set((pastYears ?? []).map((y) => y.id));
  if (currentYear) ids.add(currentYear.id);
  const yearOptions = [...ids]
    .map((id) => yearById.get(id))
    .filter((y) => !!y)
    .sort((a, b) => (b.start_date ?? "").localeCompare(a.start_date ?? ""))
    .map((y) => ({ value: y.id, label: y.id === currentYear?.id ? `${y.label} (current)` : y.label }));

  return {
    currentYear,
    yearLoading,
    viewingYearId,
    viewingLabel: yearById.get(viewingYearId)?.label,
    isArchive,
    yearOptions,
    selectYear: (id: string) => setSelectedYearId(id || null),
  };
}
