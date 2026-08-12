import { useMemo, useState } from "react";
import { Link, useParams, useNavigate } from "react-router";
import { Button, Tag, InlineNotification, TextInput } from "@carbon/react";
import { ArrowLeft, Save, CheckmarkFilled, Search, UserMultiple, Warning } from "@carbon/icons-react";
import { getErrorMessage } from "../../../lib/errorMessage";
import { useSession, useSessionRecords, useMarkAttendance } from "../../../queries/useAttendance";
import { useClass, useClassStudents } from "../../../queries/useClasses";
import { useGrades } from "../../../queries/useGrades";
import { useTeachers } from "../../../queries/useTeachers";
import { useRole } from "../../../hooks/useRole";
import LoadingSpinner from "../../../components/common/LoadingSpinner";
import ErrorMessage from "../../../components/common/ErrorMessage";
import { recordsToState, type Status } from "./constants";
import StudentAttendanceRow from "./components/StudentAttendanceRow";

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

  const isAdmin = role === "admin";
  // A session becomes read-only for teachers 24h after it was taken —
  // admins can always mark/edit, whether or not the session is locked.
  const locked = !!session?.created_at && new Date().getTime() - new Date(session.created_at).getTime() > 24 * 60 * 60 * 1000;
  const readOnly = locked && !isAdmin;
  const isOverride = locked && isAdmin;

  const [statuses, setStatuses] = useState<Record<string, Status>>({});
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [search, setSearch] = useState("");
  const [saved, setSaved] = useState(false);
  const [reason, setReason] = useState("");

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
      excused: Object.values(statuses).filter((v) => v === "excused").length,
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
      { records: recordsToSend, reason: isOverride ? reason.trim() || undefined : undefined },
      {
        onSuccess: () => {
          setSaved(true);
          setTimeout(() => navigate("/attendance"), 1200);
        },
      },
    );
  };

  const saveError = markAttendance.isError
    ? getErrorMessage(markAttendance.error, "Failed to save attendance")
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
        {locked && !isAdmin && (
          <InlineNotification
            kind="warning"
            title="This session is locked"
            subtitle="More than 24 hours have passed since it was taken. Ask an administrator to edit it."
            lowContrast
            hideCloseButton
            style={{ maxWidth: "100%", marginBottom: "1.5rem" }}
          />
        )}
        {isOverride && (
          <InlineNotification
            kind="info"
            title="Editing a locked session"
            subtitle="This session is more than 24 hours old. As an administrator you can still edit it — please note a reason below; the change will be recorded in the audit log."
            lowContrast
            hideCloseButton
            style={{ maxWidth: "100%", marginBottom: "1.5rem" }}
          />
        )}

        {/* Summary bar */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: "0.75rem", marginBottom: "1.5rem" }}>
          {[
            { label: "Present", count: summary.present, color: "#24a148" },
            { label: "Absent", count: summary.absent, color: "#da1e28" },
            { label: "Late", count: summary.late, color: "#7d5a00" },
            { label: "Excused", count: summary.excused, color: "#6929c4" },
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
                  {filtered.map((student, idx) => (
                    <StudentAttendanceRow
                      key={student.id}
                      student={student}
                      idx={idx}
                      status={statuses[student.id] ?? null}
                      note={notes[student.id] ?? ""}
                      readOnly={readOnly}
                      onMark={(s) => mark(student.id, s)}
                      onNoteChange={(value) => setNotes((prev) => ({ ...prev, [student.id]: value }))}
                    />
                  ))}
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
        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", padding: "1rem 0" }}>
        {isOverride && (
          <TextInput
            id="attendance-override-reason"
            labelText="Reason for editing this locked session"
            placeholder="e.g. Corrected after guardian phone call"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            style={{ maxWidth: "28rem" }}
          />
        )}
        <div style={{ display: "flex", alignItems: "center", gap: "1rem", flexWrap: "wrap" }}>
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
        </div>
        )}
      </div>
    </div>
  );
}
