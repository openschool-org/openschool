import StatusTag from "@/shared/ui/StatusTag";
import { getInitials } from "@/shared/lib/name";
import type { Student } from "@/features/students/api/student";
import { STATUS_STYLES, type Status } from "@/features/attendance/constants";
import StatusButton from "@/features/attendance/components/StatusButton";

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
          <div className="os-w-1t os-h-1t os-rounded-full os-flex os-items-center os-justify-center os-text-xs os-fw-700 os-shrink-0" style={{ background: status ? STATUS_STYLES[status].bg : "var(--os-accent-light)", border: `1px solid ${status ? STATUS_STYLES[status].border : "var(--os-accent-border)"}`, color: status ? STATUS_STYLES[status].color : "var(--os-accent)" }}
          >
            {getInitials(student.full_name)}
          </div>
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
