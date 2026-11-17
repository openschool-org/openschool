import { useState } from "react";
import type { TimetableEntry } from "@/features/timetable/api/timetable";
import type { CellForm } from "@/features/timetable/components/TimetableCellModal";
import { useSaveTimetableEntries, useDeleteTimetableEntry } from "@/features/timetable/queries/useTimetables";

const EMPTY_FORM: CellForm = { subjectId: "", teacherId: "", classroomId: "" };

// The period cell being edited in the timetable editor, and saving or clearing it.
export function useTimetableCell(timetableId: string, entries: TimetableEntry[] | undefined) {
  const saveEntries = useSaveTimetableEntries(timetableId);
  const deleteEntry = useDeleteTimetableEntry(timetableId);
  const [cell, setCell] = useState<{ day: number; period: number } | null>(null);
  const [form, setForm] = useState<CellForm>(EMPTY_FORM);

  const entryAt = (day: number, period: number) => entries?.find((e) => e.day_of_week === day && e.period_number === period);
  const current = cell ? entryAt(cell.day, cell.period) : undefined;

  const open = (day: number, period: number) => {
    const existing = entryAt(day, period);
    setForm({ subjectId: existing?.subject_id ?? "", teacherId: existing?.teacher_id ?? "", classroomId: existing?.classroom_id ?? "" });
    setCell({ day, period });
  };

  const save = () => {
    if (!cell) return;
    saveEntries.mutate(
      [{ day_of_week: cell.day, period_number: cell.period, subject_id: form.subjectId || null, teacher_id: form.teacherId || null, classroom_id: form.classroomId || null }],
      { onSuccess: () => setCell(null) },
    );
  };

  const clear = () => {
    if (cell) deleteEntry.mutate({ day: cell.day, period: cell.period });
  };

  return { cell, current, form, setForm, entryAt, open, save, clear, close: () => setCell(null), saveEntries, deleteEntry };
}
