import { useMemo, useState } from "react";
import { Link, useParams, useNavigate } from "react-router";
import { Button, Tag } from "@carbon/react";
import {
  ArrowLeft,
  Save,
  CheckmarkFilled,
  CloseFilled,
  Time,
  Search,
  UserMultiple,
  Warning,
} from "@carbon/icons-react";
import { AxiosError } from "axios";
import { useSession, useSessionRecords, useMarkAttendance } from "../../../queries/useAttendance";
import { useClass, useClassStudents } from "../../../queries/useClasses";
import { useGrades } from "../../../queries/useGrades";
import { useTeachers } from "../../../queries/useTeachers";
import { useRole } from "../../../hooks/useRole";
import LoadingSpinner from "../../../components/common/LoadingSpinner";
import ErrorMessage from "../../../components/common/ErrorMessage";
import type { AttendanceRecordRow } from "../../../services/attendance";

// The schema also allows "excused", but this screen only exposes the three
// statuses a teacher marks day to day; excused stays a valid value a record
// can carry, just not one this UI writes.
type Status = "present" | "absent" | "late" | null;

const STATUS_STYLES: Record<
  NonNullable<Status>,
  { bg: string; border: string; color: string; label: string }
> = {
  present: { bg: "#defbe6", border: "#24a148", color: "#0e6027", label: "Present" },
  absent: { bg: "#fff1f1", border: "#da1e28", color: "#a2191f", label: "Absent" },
  late: { bg: "#fdf6dd", border: "#f1c21b", color: "#7d5a00", label: "Late" },
};

function StatusButton({
  value,
  selected,
  onClick,
}: {
  value: NonNullable<Status>;
  selected: boolean;
  onClick: () => void;
}) {
  const cfg = STATUS_STYLES[value];
  return (
    <button
      onClick={onClick}
      style={{
        padding: "0.3rem 0.75rem",
        fontSize: "0.75rem",
        fontWeight: selected ? 600 : 400,
        fontFamily: "inherit",
        cursor: "pointer",
        border: `1px solid ${selected ? cfg.border : "#e0e0e0"}`,
        borderRadius: "2px",
        background: selected ? cfg.bg : "#ffffff",
        color: selected ? cfg.color : "#525252",
        transition: "all 0.1s",
        whiteSpace: "nowrap",
      }}
    >
      {value === "present" && (
        <CheckmarkFilled size={12} style={{ marginRight: "4px", fill: selected ? cfg.color : "#8d8d8d", verticalAlign: "middle" }} />
      )}
      {value === "absent" && (
        <CloseFilled size={12} style={{ marginRight: "4px", fill: selected ? cfg.color : "#8d8d8d", verticalAlign: "middle" }} />
      )}
      {value === "late" && (
        <Time size={12} style={{ marginRight: "4px", fill: selected ? cfg.color : "#8d8d8d", verticalAlign: "middle" }} />
      )}
      {cfg.label}
    </button>
  );
}

function recordsToState(records: AttendanceRecordRow[]) {
  const statuses: Record<string, Status> = {};
  const notes: Record<string, string> = {};
  for (const r of records) {
    if (r.status === "present" || r.status === "absent" || r.status === "late") {
      statuses[r.student_id] = r.status;
    }
    if (r.note) notes[r.student_id] = r.note;
  }
  return { statuses, notes };
}

export default function AttendanceMark() {
  const { id = "" } = useParams();
  const navigate = useNavigate();

  const { data: session, isLoading: sessionLoading, isError: sessionError } = useSession(id);
  const { data: records, isLoading: recordsLoading } = useSessionRecords(id);
  const { data: cls } = useClass(session?.class_id ?? "");
  const { data: students, isLoading: studentsLoading } = useClassStudents(session?.class_id ?? "");
  const { data: grades } = useGrades();
  const { data: teachers } = useTeachers();
  const { role } = useRole();
  const markAttendance = useMarkAttendance(id);

  // Admins view attendance but do not mark it — teachers do the marking.
  const readOnly = role === "admin";

  const [statuses, setStatuses] = useState<Record<string, Status>>({});
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [search, setSearch] = useState("");
  const [saved, setSaved] = useState(false);

  // Seed local edit state from whatever has already been marked for this
  // session. Adjusted during render (React's recommended pattern for "sync an
  // editable draft from a prop once it arrives") rather than in an effect, so
  // there is no extra render and no lint violation for setState-in-effect.
  const [loadedFor, setLoadedFor] = useState<string | null>(null);
  if (records && loadedFor !== id) {
    const { statuses: s, notes: n } = recordsToState(records);
    setStatuses(s);
    setNotes(n);
    setLoadedFor(id);
  }

  const gradeName = grades?.find((g) => g.id === cls?.grade_id)?.name;
  const teacherName = teachers?.find((t) => t.id === session?.taken_by)?.full_name;

  const mark = (studentId: string, status: NonNullable<Status>) => {
    setStatuses((prev) => ({ ...prev, [studentId]: prev[studentId] === status ? null : status }));
    setSaved(false);
  };

  const markAll = (status: NonNullable<Status>) => {
    const next: Record<string, Status> = {};
    (students ?? []).forEach((s) => {
      next[s.id] = status;
    });
    setStatuses(next);
    setSaved(false);
  };

  const filtered = useMemo(
    () =>
      (students ?? []).filter(
        (s) =>
          s.full_name.toLowerCase().includes(search.toLowerCase()) ||
          s.index_number.toLowerCase().includes(search.toLowerCase()),
      ),
    [students, search],
  );

  const summary = useMemo(
    () => ({
      present: Object.values(statuses).filter((v) => v === "present").length,
      absent: Object.values(statuses).filter((v) => v === "absent").length,
      late: Object.values(statuses).filter((v) => v === "late").length,
      unmarked: (students ?? []).length - Object.values(statuses).filter(Boolean).length,
    }),
    [statuses, students],
  );

  const handleSave = () => {
    const recordsToSend = Object.entries(statuses)
      .filter((entry): entry is [string, NonNullable<Status>] => !!entry[1])
      .map(([student_id, status]) => ({
        student_id,
        status,
        note: notes[student_id]?.trim() || undefined,
      }));

    markAttendance.mutate(
      { records: recordsToSend },
      {
        onSuccess: () => {
          setSaved(true);
          setTimeout(() => navigate("/attendance"), 1200);
        },
      },
    );
  };

  const saveError = markAttendance.isError
    ? ((markAttendance.error as AxiosError<{ error: string }>).response?.data?.error ??
        "Failed to save attendance")
    : null;

  if (sessionLoading) return <LoadingSpinner />;
  if (sessionError || !session) {
    return (
      <div style={{ padding: "2rem" }}>
        <ErrorMessage message="Failed to load attendance session" />
      </div>
    );
  }

  return (
    <div style={{ background: "#f4f4f4", minHeight: "calc(100vh - 3rem)" }}>
      {/* Session banner */}
      <div
        style={{
          padding: "1.25rem 2rem",
          display: "flex",
          alignItems: "center",
          gap: "1.5rem",
          flexWrap: "wrap",
          borderBottom: "1px solid #e0e0e0",
        }}
      >
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.25rem" }}>
            <span style={{ fontSize: "1.125rem", fontWeight: 600, color: "#161616" }}>
              Class {cls?.name ?? "…"}
            </span>
            {gradeName && (
              <Tag type="blue" size="sm">
                {gradeName}
              </Tag>
            )}
          </div>
          <div style={{ display: "flex", gap: "1.5rem", flexWrap: "wrap" }}>
            {[
              ["Teacher", teacherName ?? "—"],
              ["Date", session.date],
            ].map(([label, val]) => (
              <span key={label} style={{ fontSize: "0.8rem", color: "#525252" }}>
                <span style={{ color: "#8d8d8d", marginRight: "0.3rem" }}>{label}:</span>
                {val}
              </span>
            ))}
          </div>
        </div>
        <Button renderIcon={ArrowLeft} kind="ghost" size="sm" as={Link} to="/attendance">
          Back
        </Button>
      </div>

      <div style={{ padding: "1.5rem 2rem" }}>
        {/* Summary bar */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "0.75rem", marginBottom: "1.5rem" }}>
          {[
            { label: "Present", count: summary.present, color: "#24a148" },
            { label: "Absent", count: summary.absent, color: "#da1e28" },
            { label: "Late", count: summary.late, color: "#7d5a00" },
            { label: "Unmarked", count: summary.unmarked, color: "#525252" },
          ].map(({ label, count, color }) => (
            <div
              key={label}
              style={{
                background: "#ffffff",
                border: "1px solid #e0e0e0",
                borderTop: `3px solid ${color}`,
                padding: "0.875rem 1rem",
              }}
            >
              <p style={{ margin: "0 0 0.25rem", fontSize: "0.6875rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.07em", color: "#525252" }}>
                {label}
              </p>
              <p style={{ margin: 0, fontSize: "1.75rem", fontWeight: 300, color: "#161616" }}>{count}</p>
            </div>
          ))}
        </div>

        {/* Toolbar */}
        <div className="os-section">
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", padding: "0.875rem 1.5rem", borderBottom: "1px solid #e0e0e0", flexWrap: "wrap" }}>
            <div className="os-search" style={{ maxWidth: "280px" }}>
              <Search size={16} className="os-search__icon" />
              <input
                className="os-search__input"
                placeholder="Search student…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div style={{ flex: 1 }} />
            {!readOnly && (
              <>
                <span style={{ fontSize: "0.75rem", color: "#525252", whiteSpace: "nowrap" }}>Mark all:</span>
                <button
                  onClick={() => markAll("present")}
                  style={{ padding: "0.375rem 0.875rem", fontSize: "0.75rem", fontWeight: 600, cursor: "pointer", border: "1px solid #24a148", background: "#defbe6", color: "#0e6027", fontFamily: "inherit", borderRadius: "2px" }}
                >
                  ✓ Present
                </button>
                <button
                  onClick={() => markAll("absent")}
                  style={{ padding: "0.375rem 0.875rem", fontSize: "0.75rem", fontWeight: 600, cursor: "pointer", border: "1px solid #da1e28", background: "#fff1f1", color: "#a2191f", fontFamily: "inherit", borderRadius: "2px" }}
                >
                  ✕ Absent
                </button>
                <button
                  onClick={() => setStatuses({})}
                  style={{ padding: "0.375rem 0.875rem", fontSize: "0.75rem", cursor: "pointer", border: "1px solid #e0e0e0", background: "#ffffff", color: "#525252", fontFamily: "inherit", borderRadius: "2px" }}
                >
                  Clear
                </button>
              </>
            )}
          </div>

          {studentsLoading || recordsLoading ? (
            <LoadingSpinner />
          ) : (
            <>
              <table className="os-table">
                <thead>
                  <tr>
                    <th style={{ width: "2.5rem" }}>#</th>
                    <th>Student</th>
                    <th>Index No.</th>
                    <th>Attendance</th>
                    <th>Note</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((student, idx) => {
                    const status = statuses[student.id] ?? null;
                    return (
                      <tr
                        key={student.id}
                        style={{ background: status ? STATUS_STYLES[status].bg + "66" : "transparent" }}
                      >
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
                              <span
                                style={{
                                  display: "inline-flex",
                                  alignItems: "center",
                                  padding: "0.2rem 0.6rem",
                                  fontSize: "0.75rem",
                                  fontWeight: 600,
                                  border: `1px solid ${STATUS_STYLES[status].border}`,
                                  background: STATUS_STYLES[status].bg,
                                  color: STATUS_STYLES[status].color,
                                  borderRadius: "2px",
                                }}
                              >
                                {STATUS_STYLES[status].label}
                              </span>
                            ) : (
                              <span style={{ color: "#c6c6c6", fontSize: "0.75rem" }}>Not marked</span>
                            )
                          ) : (
                            <div style={{ display: "flex", gap: "0.375rem" }}>
                              {(["present", "absent", "late"] as const).map((s) => (
                                <StatusButton
                                  key={s}
                                  value={s}
                                  selected={status === s}
                                  onClick={() => mark(student.id, s)}
                                />
                              ))}
                            </div>
                          )}
                        </td>
                        <td>
                          {readOnly ? (
                            <span style={{ fontSize: "0.75rem", color: notes[student.id] ? "#525252" : "#c6c6c6" }}>
                              {notes[student.id] || "—"}
                            </span>
                          ) : status === "absent" || status === "late" ? (
                            <input
                              placeholder="Optional note…"
                              value={notes[student.id] ?? ""}
                              onChange={(e) =>
                                setNotes((prev) => ({ ...prev, [student.id]: e.target.value }))
                              }
                              style={{ padding: "0.25rem 0.5rem", fontSize: "0.75rem", fontFamily: "inherit", border: "1px solid #e0e0e0", outline: "none", width: "140px" }}
                            />
                          ) : (
                            <span style={{ color: "#c6c6c6", fontSize: "0.75rem" }}>—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {filtered.length === 0 && (
                <div className="os-placeholder">
                  <UserMultiple size={32} />
                  <p>
                    {students && students.length === 0
                      ? "No students are enrolled in this class."
                      : `No students match "${search}"`}
                  </p>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer actions */}
        {!readOnly && (
        <div style={{ display: "flex", alignItems: "center", gap: "1rem", padding: "1rem 0", flexWrap: "wrap" }}>
          {summary.unmarked > 0 && (
            <div style={{ display: "flex", alignItems: "center", gap: "0.375rem", fontSize: "0.8125rem", color: "#7d5a00" }}>
              <Warning size={16} style={{ fill: "#f1c21b" }} />
              {summary.unmarked} student{summary.unmarked !== 1 ? "s" : ""} not yet marked
            </div>
          )}
          {saveError && (
            <span style={{ fontSize: "0.8125rem", color: "#da1e28" }}>{saveError}</span>
          )}
          <div style={{ flex: 1 }} />
          {saved && (
            <span style={{ fontSize: "0.8125rem", color: "#24a148", display: "flex", alignItems: "center", gap: "0.375rem" }}>
              <CheckmarkFilled size={16} style={{ fill: "#24a148" }} /> Saved — redirecting…
            </span>
          )}
          <Button kind="secondary" size="md" as={Link} to="/attendance">
            Cancel
          </Button>
          <Button
            renderIcon={Save}
            kind="primary"
            size="md"
            onClick={handleSave}
            disabled={saved || markAttendance.isPending}
          >
            {markAttendance.isPending ? "Saving…" : "Save Attendance"}
          </Button>
        </div>
        )}
      </div>
    </div>
  );
}
