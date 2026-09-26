import { useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router";
import { Button, Tag, InlineNotification, TextInput } from "@carbon/react";
import { ArrowLeft, Save, Search, UserMultiple, Warning } from "@carbon/icons-react";
import { getErrorMessage } from "@/shared/api/errors";
import { isLockedAfter24Hours } from "@/shared/lib/date";
import { useSession, useSessionRecords, useMarkAttendance } from "@/features/attendance/queries/useAttendance";
import { useClass } from "@/features/academics/queries/useClasses";
import { useStudentsByClass } from "@/features/students/queries/useStudents";
import { useGrades } from "@/features/academics/queries/useGrades";
import { useTeacher } from "@/features/teachers/queries/useTeachers";
import { useRole } from "@/shared/auth/useRole";
import { useAttendanceMarking } from "@/features/attendance/hooks/useAttendanceMarking";
import { useUnsavedChangesGuard } from "@/shared/hooks/useUnsavedChangesGuard";
import AttendanceSummaryCards from "@/features/attendance/components/AttendanceSummaryCards";
import StudentAttendanceRow from "@/features/attendance/components/StudentAttendanceRow";
import LoadingSpinner from "@/shared/ui/LoadingSpinner";
import ErrorMessage from "@/shared/ui/ErrorMessage";
import TableSkeleton from "@/shared/ui/TableSkeleton";
import UnsavedChangesModal from "@/shared/ui/UnsavedChangesModal";
import { useToast } from "@/shared/ui/toast/useToast";
import { usePageTitle } from "@/shared/hooks/usePageTitle";

const HEADERS = ["#", "Student", "Index No.", "Attendance", "Note"];

export default function AttendanceMark() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const { role } = useRole();
  const { showToast } = useToast();

  const { data: session, isLoading: sessionLoading, isError: sessionError } = useSession(id);
  const { data: records, isLoading: recordsLoading } = useSessionRecords(id);
  const { data: cls } = useClass(session?.class_id ?? "");
  usePageTitle(cls ? `Mark attendance ${cls.name}` : null);
  const { data: students, isLoading: studentsLoading } = useStudentsByClass(session?.class_id ?? "");
  const { data: grades } = useGrades();
  // Who took this session - a single-record lookup by id, not a picker, so
  // a capped /teachers page can't be used as a directory.
  const { data: takenByTeacher } = useTeacher(session?.taken_by ?? "");
  const markAttendance = useMarkAttendance(id);
  const marking = useAttendanceMarking(id, records, students);
  const unsavedGuard = useUnsavedChangesGuard(marking.hasUnsaved);

  const [search, setSearch] = useState("");
  const [reason, setReason] = useState("");

  const isAdmin = role === "admin";
  const locked = isLockedAfter24Hours(session?.created_at);
  const readOnly = locked && !isAdmin;
  const isOverride = locked && isAdmin;
  const backPath = role === "teacher" ? "/t/attendance" : "/attendance";
  const gradeName = grades?.find((g) => g.id === cls?.grade_id)?.name;
  const teacherName = takenByTeacher?.full_name;

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return (students ?? []).filter((s) => s.full_name.toLowerCase().includes(q) || s.index_number.toLowerCase().includes(q));
  }, [students, search]);

  const save = () => {
    markAttendance.mutate(
      { records: marking.toRecords(), reason: isOverride ? reason.trim() || undefined : undefined },
      { onSuccess: () => { marking.clearDraft(); marking.markSaved(); showToast({ kind: "success", title: "Attendance saved" }); navigate(backPath); } },
    );
  };

  if (sessionLoading) return <LoadingSpinner />;
  if (sessionError || !session) {
    return (
      <div className="os-p-8">
        <ErrorMessage message="Failed to load attendance session" />
      </div>
    );
  }

  return (
    <div className="os-bg-layer-hover os-min-h-content">
      <div className="os-py-5 os-px-8 os-flex os-items-center os-gap-6 os-wrap os-border-b">
        <div className="os-flex-1">
          <div className="os-flex os-items-center os-gap-2 os-mb-1">
            <span className="os-text-lg os-fw-600 os-c-primary">Class {cls?.name ?? "…"}</span>
            {gradeName && <Tag type="blue" size="sm">{gradeName}</Tag>}
          </div>
          <div className="os-flex os-gap-6 os-wrap">
            {teacherName && <span className="os-text-sm os-c-secondary">{teacherName}</span>}
            <span className="os-text-sm os-c-secondary">{session.date}</span>
          </div>
        </div>
        <Button renderIcon={ArrowLeft} kind="ghost" size="sm" onClick={() => unsavedGuard.guard(() => navigate(backPath))}>Back</Button>
      </div>

      <div className="os-py-6 os-px-8">
        {readOnly && (
          <InlineNotification kind="warning" title="This session is locked" subtitle="More than 24 hours have passed since it was taken. Ask an administrator to edit it." lowContrast hideCloseButton className="os-max-w-full os-mb-6" />
        )}
        {isOverride && (
          <InlineNotification kind="info" title="Editing a locked session" subtitle="This session is more than 24 hours old. As an administrator you can still edit it. Note a reason below; the change is recorded in the audit log." lowContrast hideCloseButton className="os-max-w-full os-mb-6" />
        )}

        <AttendanceSummaryCards summary={marking.summary} />

        <div className="os-section">
          <div className="os-flex os-items-center os-gap-3 os-py-3h os-px-6 os-border-b os-wrap">
            <div className="os-search os-max-w-px-280">
              <Search size={16} className="os-search__icon" />
              <input className="os-search__input" placeholder="Search student…" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <div className="os-flex-1" />
            {!readOnly && (
              <>
                <span className="os-text-xs os-c-secondary os-nowrap">Mark all:</span>
                <button className="os-quick-mark os-quick-mark--present" onClick={() => marking.markAll("present")}>✓ Present</button>
                <button className="os-quick-mark os-quick-mark--absent" onClick={() => marking.markAll("absent")}>✕ Absent</button>
                <button className="os-quick-mark os-quick-mark--clear" onClick={marking.clearAll}>Clear</button>
              </>
            )}
          </div>

          {studentsLoading || recordsLoading ? (
            <TableSkeleton headers={HEADERS} />
          ) : (
            <>
              <table className="os-table os-table--attendance">
                <thead>
                  <tr>
                    <th className="os-w-2h">#</th>
                    <th>Student</th>
                    <th>Index no.</th>
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
                      status={marking.statuses[student.id] ?? null}
                      note={marking.notes[student.id] ?? ""}
                      readOnly={readOnly}
                      onMark={(s) => marking.mark(student.id, s)}
                      onNoteChange={(value) => marking.setNote(student.id, value)}
                    />
                  ))}
                </tbody>
              </table>
              {filtered.length === 0 && (
                <div className="os-placeholder">
                  <UserMultiple size={32} />
                  <p>{students?.length === 0 ? "No students are enrolled in this class." : `No students match "${search}"`}</p>
                </div>
              )}
            </>
          )}
        </div>

        {!readOnly && (
          <div className="os-flex os-col os-gap-3 os-py-4 os-attendance-sticky-actions">
            {isOverride && (
              <TextInput id="attendance-override-reason" labelText="Reason for editing this locked session" placeholder="e.g. Corrected after guardian phone call" value={reason} onChange={(e) => setReason(e.target.value)} className="os-max-w-28" />
            )}
            <div className="os-flex os-items-center os-gap-4 os-wrap">
              {marking.summary.unmarked > 0 && (
                <div className="os-flex os-items-center os-gap-1h os-text-sm os-c-status-late">
                  <Warning size={16} className="os-fill-warning" />
                  {marking.summary.unmarked} student{marking.summary.unmarked !== 1 ? "s" : ""} not yet marked
                </div>
              )}
              {markAttendance.isError && <span className="os-text-sm os-c-danger">{getErrorMessage(markAttendance.error, "Failed to save attendance")}</span>}
              <div className="os-flex-1" />
              <Button kind="secondary" size="md" onClick={() => unsavedGuard.guard(() => navigate(backPath))}>Cancel</Button>
              <Button renderIcon={Save} kind="primary" size="md" onClick={save} disabled={markAttendance.isPending}>
                {markAttendance.isPending ? "Saving…" : "Save attendance"}
              </Button>
            </div>
          </div>
        )}
      </div>

      <UnsavedChangesModal open={unsavedGuard.modalOpen} onStay={unsavedGuard.cancelLeave} onLeave={unsavedGuard.confirmLeave} />
    </div>
  );
}
