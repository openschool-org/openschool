import StatusTag from "../../../../components/common/StatusTag";
import type { Student } from "../../../../services/student";
import { STATUS_STYLES, type Status } from "../constants";
import StatusButton from "./StatusButton";

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
    <tr style={{ background: status ? STATUS_STYLES[status].bg + "66" : "transparent" }}>
      <td style={{ color: "#8d8d8d", fontFamily: "IBM Plex Mono, monospace", fontSize: "0.75rem" }}>
        {idx + 1}
      </td>
      <td>
        <div style={{ display: "flex", alignItems: "center", gap: "0.625rem" }}>
          <div
            style={{
              width: "1.75rem",
              height: "1.75rem",
              borderRadius: "50%",
              background: status ? STATUS_STYLES[status].bg : "#eef4f8",
              border: `1px solid ${status ? STATUS_STYLES[status].border : "#b3cedc"}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "0.6rem",
              fontWeight: 700,
              color: status ? STATUS_STYLES[status].color : "#406AAF",
              flexShrink: 0,
            }}
          >
            {student.full_name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
          </div>
          <span style={{ fontWeight: 500, fontSize: "0.875rem" }}>{student.full_name}</span>
        </div>
      </td>
      <td className="os-table__mono">{student.index_number}</td>
      <td>
        {readOnly ? (
          status ? (
            <StatusTag {...STATUS_STYLES[status]} />
          ) : (
            <span style={{ color: "#c6c6c6", fontSize: "0.75rem" }}>Not marked</span>
          )
        ) : (
          <div style={{ display: "flex", gap: "0.375rem" }}>
            {(["present", "absent", "late", "excused"] as const).map((s) => (
              <StatusButton key={s} value={s} selected={status === s} onClick={() => onMark(s)} />
            ))}
          </div>
        )}
      </td>
      <td>
        {readOnly ? (
          <span style={{ fontSize: "0.75rem", color: note ? "#525252" : "#c6c6c6" }}>{note || "—"}</span>
        ) : status === "absent" || status === "late" || status === "excused" ? (
          <input
            placeholder="Optional note…"
            aria-label={`Note for ${student.full_name}`}
            value={note}
            onChange={(e) => onNoteChange(e.target.value)}
            style={{ padding: "0.25rem 0.5rem", fontSize: "0.75rem", fontFamily: "inherit", border: "1px solid #e0e0e0", outline: "none", width: "140px" }}
          />
        ) : (
          <span style={{ color: "#c6c6c6", fontSize: "0.75rem" }}>—</span>
        )}
      </td>
    </tr>
  );
}
