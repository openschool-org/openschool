import StatusTag from "@/shared/ui/StatusTag";
import type { Student } from "@/features/students/api/student";
import { STATUS_STYLES, type Status } from "@/features/attendance/constants";
import StatusButton from "@/features/attendance/components/StatusButton";
import Avatar from "@/shared/ui/Avatar";

export default function StudentAttendanceRow({
  student,
  idx,
  status,
  note,
  readOnly,
  onMark,
  onNoteChange,
}: {
  student: Student;
  idx: number;
  status: Status;
  note: string;
  readOnly: boolean;
  onMark: (status: NonNullable<Status>) => void;
  onNoteChange: (value: string) => void;
}) {
  return (
    <tr style={{ background: status ? `color-mix(in srgb, ${STATUS_STYLES[status].bg} 40%, white)` : "transparent" }}>
      <td className="os-c-tertiary os-mono os-text-xs">
        {idx + 1}
      </td>
      <td>
        <div className="os-flex os-items-center os-gap-2h">
          <Avatar name={student.full_name} size="sm" />
          <span className="os-fw-500 os-text-md">{student.full_name}</span>
        </div>
      </td>
      <td className="os-table__mono" data-label="Index no.">{student.index_number}</td>
      <td data-label="Attendance">
        {readOnly ? (
          status ? (
            <StatusTag {...STATUS_STYLES[status]} />
          ) : (
            <span className="os-c-disabled os-text-xs">Not marked</span>
          )
        ) : (
          <div className="os-flex os-gap-1h os-wrap">
            {(["present", "absent", "late", "excused"] as const).map((s) => (
              <StatusButton key={s} value={s} selected={status === s} onClick={() => onMark(s)} />
            ))}
          </div>
        )}
      </td>
      <td data-label="Note">
        {readOnly ? (
          <span className={`os-text-xs ${note ? "os-c-secondary" : "os-c-disabled"}`}>{note || "-"}</span>
        ) : status === "absent" || status === "late" || status === "excused" ? (
          <input
            className="os-note-input"
            placeholder="Optional note…"
            aria-label={`Note for ${student.full_name}`}
            value={note}
            onChange={(e) => onNoteChange(e.target.value)}
          />
        ) : (
          <span className="os-c-disabled os-text-xs">-</span>
        )}
      </td>
    </tr>
  );
}
