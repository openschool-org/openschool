import { useEffect, useMemo, useState } from "react";
import type { AttendanceRecordRow } from "@/features/attendance/api/attendance";
import type { Student } from "@/features/students/api/student";
import { recordsToState, type Status } from "@/features/attendance/constants";
import { useToast } from "@/shared/ui/toast/useToast";

interface Draft {
  statuses: Record<string, Status>;
  notes: Record<string, string>;
}

// A note box shows only for these, so a note left from an earlier status is not saved.
const NOTE_STATUSES = new Set<Status>(["absent", "late", "excused"]);

const draftKey = (sessionId: string) => `attendance-draft:${sessionId}`;

function readDraft(sessionId: string): Draft | null {
  try {
    const raw = window.sessionStorage.getItem(draftKey(sessionId));
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function writeDraft(sessionId: string, draft: Draft) {
  try {
    window.sessionStorage.setItem(draftKey(sessionId), JSON.stringify(draft));
  } catch {
    void 0;
  }
}

function removeDraft(sessionId: string) {
  try {
    window.sessionStorage.removeItem(draftKey(sessionId));
  } catch {
    void 0;
  }
}

// Local marking state for one session: per-student status and note, plus the running summary.
export function useAttendanceMarking(sessionId: string, records: AttendanceRecordRow[] | undefined, students: Student[] | undefined) {
  const { showToast } = useToast();
  const [statuses, setStatuses] = useState<Record<string, Status>>({});
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [saved, setSaved] = useState<Draft>({ statuses: {}, notes: {} });
  const [loadedFor, setLoadedFor] = useState<string | null>(null);
  const [restoredDraftFor, setRestoredDraftFor] = useState<string | null>(null);

  if (records && loadedFor !== sessionId) {
    const seeded = recordsToState(records);
    const draft = readDraft(sessionId);
    if (draft) {
      setStatuses(draft.statuses);
      setNotes(draft.notes);
      setRestoredDraftFor(sessionId);
    } else {
      setStatuses(seeded.statuses);
      setNotes(seeded.notes);
    }
    setSaved(seeded);
    setLoadedFor(sessionId);
  }

  useEffect(() => {
    if (!restoredDraftFor) return;
    showToast({ kind: "info", title: "Restored your unsaved marks from earlier" });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- fires once per restoredDraftFor transition; showToast is stable enough for this
  }, [restoredDraftFor]);

  useEffect(() => {
    if (loadedFor !== sessionId) return;
    if (Object.keys(statuses).length === 0 && Object.keys(notes).length === 0) return;
    writeDraft(sessionId, { statuses, notes });
  }, [sessionId, loadedFor, statuses, notes]);

  const hasUnsaved = useMemo(
    () => JSON.stringify(statuses) !== JSON.stringify(saved.statuses) || JSON.stringify(notes) !== JSON.stringify(saved.notes),
    [statuses, notes, saved],
  );

  const summary = useMemo(() => {
    const values = Object.values(statuses);
    const count = (s: Status) => values.filter((v) => v === s).length;
    return {
      present: count("present"),
      absent: count("absent"),
      late: count("late"),
      excused: count("excused"),
      unmarked: (students ?? []).length - values.filter(Boolean).length,
    };
  }, [statuses, students]);

  return {
    statuses,
    notes,
    summary,
    hasUnsaved,
    markSaved: () => setSaved({ statuses, notes }),
    // Clicking the active status again clears it.
    mark: (studentId: string, status: NonNullable<Status>) =>
      setStatuses((prev) => ({ ...prev, [studentId]: prev[studentId] === status ? null : status })),
    markAll: (status: NonNullable<Status>) => setStatuses((prev) => Object.fromEntries((students ?? []).map((s) => [s.id, prev[s.id] ?? status]))),
    clearAll: () => setStatuses({}),
    setNote: (studentId: string, value: string) => setNotes((prev) => ({ ...prev, [studentId]: value })),
    clearDraft: () => removeDraft(sessionId),
    // Marked students go in records; students whose saved mark was removed go in cleared so the server deletes it.
    toRequest: () => ({
      records: Object.entries(statuses)
        .filter((entry): entry is [string, NonNullable<Status>] => !!entry[1])
        .map(([student_id, status]) => ({ student_id, status, note: NOTE_STATUSES.has(status) ? notes[student_id]?.trim() || undefined : undefined })),
      cleared: Object.keys(saved.statuses).filter((id) => saved.statuses[id] && !statuses[id]),
    }),
  };
}
