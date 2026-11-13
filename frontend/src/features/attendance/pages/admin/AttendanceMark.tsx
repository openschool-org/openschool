import { useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router";
import { Alert, Button, Empty, Input, Tag } from "antd";
import { ArrowLeftOutlined, SaveOutlined, SearchOutlined, WarningOutlined } from "@ant-design/icons";
import { getErrorMessage } from "@/shared/api/errors";
import { isLockedAfter24Hours } from "@/shared/lib/date";
import { useSession, useSessionRecords, useMarkAttendance } from "@/features/attendance/queries/useAttendance";
import { useClass } from "@/features/academics/queries/useClasses";
import { useStudentsByClass } from "@/features/students/queries/useStudents";
import { useGrades } from "@/features/academics/queries/useGrades";
import { useRole } from "@/shared/auth/useRole";
import { useAttendanceMarking } from "@/features/attendance/hooks/useAttendanceMarking";
import { useUnsavedChangesGuard } from "@/shared/hooks/useUnsavedChangesGuard";
import AttendanceSummaryCards from "@/features/attendance/components/AttendanceSummaryCards";
import { AttendanceNoteCell, AttendanceStatusCell } from "@/features/attendance/components/AttendanceCells";
import type { Student } from "@/features/students/api/student";
import DataGrid, { type GridColumn } from "@/shared/ui/DataGrid";
import Avatar from "@/shared/ui/Avatar";
import TextField from "@/shared/ui/TextField";
import { displayName } from "@/shared/lib/name";
import LoadingSpinner from "@/shared/ui/LoadingSpinner";
import ErrorMessage from "@/shared/ui/ErrorMessage";
import TableSkeleton from "@/shared/ui/TableSkeleton";
import UnsavedChangesModal from "@/shared/ui/UnsavedChangesModal";
import ConfirmActionModal from "@/shared/ui/ConfirmActionModal";
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
  const markAttendance = useMarkAttendance(id);
  const marking = useAttendanceMarking(id, records, students);
  const unsavedGuard = useUnsavedChangesGuard(marking.hasUnsaved);

  const [search, setSearch] = useState("");
  const [bulkStatus, setBulkStatus] = useState<"absent" | null>(null);
  const [reason, setReason] = useState("");

  const isAdmin = role === "admin";
  const locked = isLockedAfter24Hours(session?.created_at);
  const readOnly = locked && !isAdmin;
  const isOverride = locked && isAdmin;
  const backPath = role === "teacher" ? "/t/attendance" : "/attendance";
  const gradeName = grades?.find((g) => g.id === cls?.grade_id)?.name;
  const teacherName = session?.taken_by_name;

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (students ?? []).filter((s) => s.full_name.toLowerCase().includes(q) || s.name_with_initials.toLowerCase().includes(q) || s.index_number.toLowerCase().includes(q));
  }, [students, search]);
  // Row number = position in the (filtered) roster, across pages.
  const position = useMemo(() => new Map(filtered.map((st, i) => [st.id, i + 1])), [filtered]);

  const columns: GridColumn<Student>[] = [
    { key: "n", header: "#", render: (st) => <span className="os-c-tertiary os-mono os-text-xs">{position.get(st.id)}</span> },
    {
      key: "student",
      header: "Student",
      render: (st) => (
        <div className="os-flex os-items-center os-gap-2h">
          <Avatar name={st.full_name} size="sm" />
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

  const save = () => {
    markAttendance.mutate(
      { ...marking.toRequest(), reason: isOverride ? reason.trim() || undefined : undefined },
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
            {gradeName && <Tag color="blue" variant="filled">{gradeName}</Tag>}
          </div>
          <div className="os-flex os-gap-6 os-wrap">
            {teacherName && <span className="os-text-sm os-c-secondary">{teacherName}</span>}
            <span className="os-text-sm os-c-secondary">{session.date}</span>
          </div>
        </div>
        <Button type="text" icon={<ArrowLeftOutlined />} onClick={() => unsavedGuard.guard(() => navigate(backPath))}>Back</Button>
      </div>

      <div className="os-py-6 os-px-8">
        {readOnly && (
          <Alert type="warning" showIcon className="os-mb-6" title="This session is locked" description="More than 24 hours have passed since it was taken. Ask an administrator to edit it." />
        )}
        {isOverride && (
          <Alert type="info" showIcon className="os-mb-6" title="Editing a locked session" description="This session is more than 24 hours old. As an administrator you can still edit it. Note a reason below; the change is recorded in the audit log." />
        )}

        <AttendanceSummaryCards summary={marking.summary} />

        <div className="os-section">
          <div className="os-flex os-items-center os-gap-3 os-py-3h os-px-6 os-border-b os-wrap">
            <Input
              className="os-max-w-px-280"
              allowClear
              prefix={<SearchOutlined />}
              aria-label="Search students"
              placeholder="Search student by name or index…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <div className="os-flex-1" />
            {!readOnly && (
              <>
                <Button danger size="small" disabled={marking.summary.unmarked === 0} onClick={() => setBulkStatus("absent")}>
                  Mark all {marking.summary.unmarked} not marked as absent
                </Button>
                <Button type="text" size="small" onClick={marking.clearAll}>Clear</Button>
              </>
            )}
          </div>

          {studentsLoading || recordsLoading ? (
            <TableSkeleton headers={HEADERS} />
          ) : (
            filtered.length === 0 ? (
              <Empty
                className="os-py-8"
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description={students?.length === 0 ? "No students are enrolled in this class." : `No students match "${search}"`}
              />
            ) : (
              <DataGrid
                rows={filtered}
                columns={columns}
                getRowId={(st) => st.id}
                noHover
                pageSize={50}
                pageSizes={[25, 50, 100]}
                rowClassName={(st) => (marking.statuses[st.id] ? `os-attendance-row--${marking.statuses[st.id]}` : "")}
              />
            )
          )}
        </div>

        {!readOnly && (
          <div className="os-flex os-col os-gap-3 os-py-4 os-attendance-sticky-actions">
            {isOverride && (
              <div className="os-max-w-28">
                <TextField id="attendance-override-reason" label="Reason for editing this locked session" placeholder="e.g. Corrected after guardian phone call" value={reason} onChange={setReason} />
              </div>
            )}
            <div className="os-flex os-items-center os-gap-4 os-wrap">
              {marking.summary.unmarked > 0 && (
                <div className="os-flex os-items-center os-gap-1h os-text-sm os-c-status-late">
                  <WarningOutlined className="os-c-warning" />
                  {marking.summary.unmarked} student{marking.summary.unmarked !== 1 ? "s" : ""} not yet marked
                </div>
              )}
              {markAttendance.isError && <span className="os-text-sm os-c-danger">{getErrorMessage(markAttendance.error, "Failed to save attendance")}</span>}
              <div className="os-flex-1" />
              <Button size="large" onClick={() => unsavedGuard.guard(() => navigate(backPath))}>Cancel</Button>
              <Button size="large" type="primary" icon={<SaveOutlined />} onClick={save} loading={markAttendance.isPending}>
                {markAttendance.isPending ? "Saving…" : "Save attendance"}
              </Button>
            </div>
          </div>
        )}
      </div>

      <ConfirmActionModal
        open={!!bulkStatus}
        title={`Mark unmarked students as ${bulkStatus ?? ""}`}
        description={`This will mark all ${marking.summary.unmarked} currently unmarked students as ${bulkStatus ?? ""}. Existing attendance marks will not change.`}
        confirmLabel={`Mark as ${bulkStatus ?? ""}`}
        danger={bulkStatus === "absent"}
        onClose={() => setBulkStatus(null)}
        onConfirm={() => { if (bulkStatus) marking.markAll(bulkStatus); setBulkStatus(null); }}
      />
      <UnsavedChangesModal open={unsavedGuard.modalOpen} onStay={unsavedGuard.cancelLeave} onLeave={unsavedGuard.confirmLeave} />
    </div>
  );
}
