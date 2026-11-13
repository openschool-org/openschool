import { Input } from "antd";
import StatusTag from "@/shared/ui/StatusTag";
import { STATUS_STYLES, type Status } from "@/features/attendance/constants";
import StatusButton from "@/features/attendance/components/StatusButton";

// Cells for one student on the attendance marking grid (pages/admin/AttendanceMark.tsx).

export function AttendanceStatusCell({ status, readOnly, onMark }: { status: Status; readOnly: boolean; onMark: (status: NonNullable<Status>) => void }) {
  if (readOnly) return status ? <StatusTag {...STATUS_STYLES[status]} /> : <span className="os-c-disabled os-text-xs">Not marked</span>;
  return (
    <div className="os-flex os-gap-1h os-wrap">
      {(["present", "absent", "late", "excused"] as const).map((s) => (
        <StatusButton key={s} value={s} selected={status === s} onClick={() => onMark(s)} />
      ))}
    </div>
  );
}

// A note only makes sense for absent, late or excused students.
export function AttendanceNoteCell({ studentName, status, note, readOnly, onNoteChange }: { studentName: string; status: Status; note: string; readOnly: boolean; onNoteChange: (value: string) => void }) {
  if (readOnly) return <span className={`os-text-xs ${note ? "os-c-secondary" : "os-c-disabled"}`}>{note || "-"}</span>;
  if (status !== "absent" && status !== "late" && status !== "excused") return <span className="os-c-disabled os-text-xs">-</span>;
  return <Input size="small" placeholder="Optional note…" aria-label={`Note for ${studentName}`} value={note} onChange={(e) => onNoteChange(e.target.value)} />;
}
