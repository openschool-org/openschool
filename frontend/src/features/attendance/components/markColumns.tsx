import type { GridColumn } from "@/shared/ui/DataGrid";
import type { Student } from "@/features/students/api/student";
import type { useAttendanceMarking } from "@/features/attendance/hooks/useAttendanceMarking";
import { AttendanceNoteCell, AttendanceStatusCell } from "@/features/attendance/components/AttendanceCells";
import { displayName } from "@/shared/lib/name";

// Roster columns for marking; `position` numbers rows across pages of the filtered roster.
export function markColumns(marking: ReturnType<typeof useAttendanceMarking>, readOnly: boolean, position: Map<string, number>): GridColumn<Student>[] {
  return [
    { key: "n", header: "#", render: (st) => <span className="os-c-tertiary os-mono os-text-xs">{position.get(st.id)}</span> },
    {
      key: "student",
      header: "Student",
      render: (st) => (
        <div className="os-flex os-items-center os-gap-2h">
          <span className="os-fw-500 os-text-md" title={st.full_name}>{displayName(st)}</span>
        </div>
      ),
    },
    { key: "index", header: "Index no.", render: (st) => <span className="os-table__mono">{st.index_number}</span> },
    {
      key: "attendance",
      header: "Attendance",
      render: (st) => <AttendanceStatusCell status={marking.statuses[st.id] ?? null} readOnly={readOnly} onMark={(v) => marking.mark(st.id, v)} />,
    },
    {
      key: "note",
      header: "Note",
      render: (st) => (
        <AttendanceNoteCell
          studentName={displayName(st)}
          status={marking.statuses[st.id] ?? null}
          note={marking.notes[st.id] ?? ""}
          readOnly={readOnly}
          onNoteChange={(v) => marking.setNote(st.id, v)}
        />
      ),
    },
  ];
}
