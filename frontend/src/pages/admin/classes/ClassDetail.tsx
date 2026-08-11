import { useMemo, useState } from "react";
import { Link, useNavigate, useParams, useLocation } from "react-router";
import {
  Button,
  Tag,
  Tabs,
  Tab,
  TabList,
  TabPanels,
  TabPanel,
  TextInput,
  DatePicker,
  DatePickerInput,
  Pagination,
  InlineNotification,
  ComposedModal,
  ModalHeader,
  ModalBody,
  ModalFooter,
} from "@carbon/react";
import { ArrowLeft, Edit, Add, UserMultiple, EventSchedule, UserFollow } from "@carbon/icons-react";
import {
  useClass,
  useClassStudents,
  useUpdateClass,
  useAssignFormTeacher,
  useAssignMonitors,
  useEnrollStudent,
  useUnenrollStudent,
} from "../../../queries/useClasses";
import {
  useClassSessions,
  useCreateSession,
  useDeleteSession,
} from "../../../queries/useAttendance";
import { useGrades } from "../../../queries/useGrades";
import { useStreams, useStreamGroups } from "../../../queries/useClasses";
import { useTeachers } from "../../../queries/useTeachers";
import { useAcademicYears } from "../../../queries/useAcademicYears";
import { useStudents } from "../../../queries/useStudents";
import type { Student } from "../../../services/student";
import type { AttendanceSession } from "../../../services/attendance";
import { getErrorMessage as apiError } from "../../../lib/errorMessage";
import LoadingSpinner from "../../../components/common/LoadingSpinner";
import ErrorMessage from "../../../components/common/ErrorMessage";
import EmptyState from "../../../components/common/EmptyState";
import ConfirmDeleteModal from "../../../components/common/ConfirmDeleteModal";
import EntityCombobox from "../../../components/common/EntityCombobox";
import ClassMarks from "./ClassMarks";
import { toYmd, todayISODate } from "../../../lib/date";

function formatClassLabel(name: string) {
  const m = name.match(/^(\d+)([^\d-].*)$/);
  return m ? `${m[1]}-${m[2]}` : name;
}

function initials(name: string) {
  return name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();
}

export default function ClassDetail() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const initialTab = (location.state as { tab?: string } | null)?.tab === "attendance" ? 1 : 0;

  const { data: cls, isLoading, isError, refetch } = useClass(id);
  const { data: students, isLoading: studentsLoading } = useClassStudents(id);
  const { data: sessions, isLoading: sessionsLoading } = useClassSessions(id);
  const { data: grades } = useGrades();
  const { data: streams } = useStreams();
  const { data: streamGroups } = useStreamGroups(cls?.stream_id ?? "");
  const { data: teachers } = useTeachers();
  const { data: years } = useAcademicYears();
  const { data: allStudents } = useStudents();

  const updateClass = useUpdateClass(id);
  const assignFormTeacher = useAssignFormTeacher(id);
  const assignMonitors = useAssignMonitors(id);
  const enrollStudent = useEnrollStudent(id);
  const unenrollStudent = useUnenrollStudent(id);
  const createSession = useCreateSession(id);
  const deleteSession = useDeleteSession(id);

  const [editOpen, setEditOpen] = useState(false);
  const [nameEdit, setNameEdit] = useState("");
  const [teacherModalOpen, setTeacherModalOpen] = useState(false);
  const [teacherChoice, setTeacherChoice] = useState("");
  const [monitorsModalOpen, setMonitorsModalOpen] = useState(false);
  const [girlMonitorChoice, setGirlMonitorChoice] = useState("");
  const [boyMonitorChoice, setBoyMonitorChoice] = useState("");
  const [enrolOpen, setEnrolOpen] = useState(false);
  const [studentChoice, setStudentChoice] = useState("");
  const [sessionOpen, setSessionOpen] = useState(false);
  const [sessionDate, setSessionDate] = useState(todayISODate());
  const [toUnenroll, setToUnenroll] = useState<Student | null>(null);
  const [toDeleteSession, setToDeleteSession] = useState<AttendanceSession | null>(null);
  const [sessionDateFilter, setSessionDateFilter] = useState("");
  const [sessionPage, setSessionPage] = useState(1);
  const [sessionPageSize, setSessionPageSize] = useState(10);

  const gradeName = grades?.find((g) => g.id === cls?.grade_id)?.name;
  const streamName = streams?.find((s) => s.id === cls?.stream_id)?.name;
  const streamGroupName = streamGroups?.find((g) => g.id === cls?.stream_group_id)?.name;
  const formTeacher = teachers?.find((t) => t.id === cls?.form_teacher_id);
  const academicYearLabel = years?.find((y) => y.id === cls?.academic_year_id)?.label;
  const girlMonitor = students?.find((s) => s.id === cls?.girl_monitor_id);
  const boyMonitor = students?.find((s) => s.id === cls?.boy_monitor_id);
  const girlMonitorCandidates = (students ?? []).filter((s) => s.gender !== "male");
  const boyMonitorCandidates = (students ?? []).filter((s) => s.gender !== "female");

  const enrolledIds = useMemo(
    () => new Set((students ?? []).map((s) => s.id)),
    [students],
  );
  const enrolCandidates = useMemo(
    () => (allStudents ?? []).filter((s) => !enrolledIds.has(s.id)),
    [allStudents, enrolledIds],
  );

  const sortedSessions = useMemo(
    () =>
      [...(sessions ?? [])]
        .filter((s) => !sessionDateFilter || s.date === sessionDateFilter)
        .sort((a, b) => b.date.localeCompare(a.date)),
    [sessions, sessionDateFilter],
  );
  const pagedSessions = useMemo(
    () =>
      sortedSessions.slice(
        (sessionPage - 1) * sessionPageSize,
        sessionPage * sessionPageSize,
      ),
    [sortedSessions, sessionPage, sessionPageSize],
  );

  const openEdit = () => {
    updateClass.reset();
    setNameEdit(cls?.name ?? "");
    setEditOpen(true);
  };

  const handleEditSave = () => {
    const name = nameEdit.trim();
    if (!name) return;
    updateClass.mutate(
      { name, form_teacher_id: cls?.form_teacher_id ?? null },
      { onSuccess: () => setEditOpen(false) },
    );
  };

  const openTeacherModal = () => {
    assignFormTeacher.reset();
    setTeacherChoice(cls?.form_teacher_id ?? "");
    setTeacherModalOpen(true);
  };

  const handleAssignTeacher = () => {
    if (!teacherChoice) return;
    assignFormTeacher.mutate(teacherChoice, {
      onSuccess: () => setTeacherModalOpen(false),
    });
  };

  const openMonitorsModal = () => {
    assignMonitors.reset();
    setGirlMonitorChoice(cls?.girl_monitor_id ?? "");
    setBoyMonitorChoice(cls?.boy_monitor_id ?? "");
    setMonitorsModalOpen(true);
  };

  const handleAssignMonitors = () => {
    assignMonitors.mutate(
      { girl_monitor_id: girlMonitorChoice || null, boy_monitor_id: boyMonitorChoice || null },
      { onSuccess: () => setMonitorsModalOpen(false) },
    );
  };

  const openEnrol = () => {
    enrollStudent.reset();
    setStudentChoice("");
    setEnrolOpen(true);
  };

  const handleEnrol = () => {
    if (!studentChoice) return;
    enrollStudent.mutate(studentChoice, {
      onSuccess: () => setEnrolOpen(false),
    });
  };

  const handleUnenrol = () => {
    if (!toUnenroll) return;
    unenrollStudent.mutate(toUnenroll.id, { onSettled: () => setToUnenroll(null) });
  };

  const handleDeleteSession = () => {
    if (!toDeleteSession) return;
    deleteSession.mutate(toDeleteSession.id, {
      onSettled: () => setToDeleteSession(null),
    });
  };

  const openNewSession = () => {
    createSession.reset();
    setSessionDate(todayISODate());
    setSessionOpen(true);
  };

  const handleCreateSession = () => {
    createSession.mutate(
      { class_id: id, date: sessionDate },
      {
        onSuccess: (session) => {
          setSessionOpen(false);
          navigate(`/attendance/sessions/${session.id}/mark`);
        },
      },
    );
  };

  if (isLoading) return <LoadingSpinner />;
  if (isError || !cls) {
    return (
      <div style={{ padding: "2rem" }}>
        <ErrorMessage message="Failed to load class" onRetry={refetch} />
      </div>
    );
  }

  const metaParts = [
    streamName,
    streamGroupName,
    formTeacher ? `Class Teacher: ${formTeacher.full_name}` : "No class teacher assigned",
    academicYearLabel,
  ].filter(Boolean);

  return (
    <div style={{ background: "#f4f4f4", minHeight: "calc(100vh - 3rem)" }}>
      <div className="os-profile__banner">
        <div
          className="os-profile__avatar"
          style={{ borderRadius: "6px", fontSize: "0.875rem", letterSpacing: "0" }}
        >
          {cls.name}
        </div>
        <div style={{ flex: 1 }}>
          <p className="os-profile__name">Grade {formatClassLabel(cls.name)}</p>
          <p className="os-profile__meta">{metaParts.join(" · ")}</p>
        </div>
        <div className="os-profile__actions">
          {streamName && (
            <Tag type="blue" size="sm">
              {streamName}
            </Tag>
          )}
          <Button renderIcon={Edit} kind="ghost" size="sm" onClick={openEdit}>
            Edit
          </Button>
          <Button renderIcon={UserMultiple} kind="ghost" size="sm" onClick={openTeacherModal}>
            {formTeacher ? "Change Teacher" : "Assign Teacher"}
          </Button>
          <Button renderIcon={UserFollow} kind="ghost" size="sm" onClick={openMonitorsModal}>
            {girlMonitor || boyMonitor ? "Change Monitors" : "Assign Monitors"}
          </Button>
          <Button renderIcon={ArrowLeft} kind="secondary" size="sm" as={Link} to="/classes">
            Back
          </Button>
        </div>
      </div>

      <div style={{ padding: "1.5rem 2rem" }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "2fr 1fr",
            gap: "1.5rem",
            alignItems: "start",
          }}
        >
          <div>
            <Tabs defaultSelectedIndex={initialTab}>
              <TabList aria-label="Class sections">
                <Tab>Students</Tab>
                <Tab>Attendance</Tab>
                <Tab>Marks</Tab>
                <Tab>Details</Tab>
              </TabList>
              <TabPanels>
                {/* ── Students ─────────────────────────────────────────── */}
                <TabPanel style={{ padding: 0 }}>
                  <div className="os-section" style={{ marginTop: "1rem" }}>
                    <div className="os-section__header">
                      <h2 className="os-section__title">Enrolled Students</h2>
                      <Button renderIcon={Add} kind="ghost" size="sm" onClick={openEnrol}>
                        Enrol
                      </Button>
                    </div>

                    {enrollStudent.isError && (
                      <InlineNotification
                        kind="error"
                        title="Could not enrol student"
                        subtitle={apiError(enrollStudent.error, "Please try again.")}
                        lowContrast
                        onClose={() => enrollStudent.reset()}
                        style={{ maxWidth: "100%", margin: "0 1.5rem 1rem" }}
                      />
                    )}
                    {unenrollStudent.isError && (
                      <InlineNotification
                        kind="error"
                        title="Could not remove student"
                        subtitle={apiError(unenrollStudent.error, "Please try again.")}
                        lowContrast
                        onClose={() => unenrollStudent.reset()}
                        style={{ maxWidth: "100%", margin: "0 1.5rem 1rem" }}
                      />
                    )}

                    {studentsLoading ? (
                      <LoadingSpinner />
                    ) : students && students.length > 0 ? (
                      <table className="os-table">
                        <thead>
                          <tr>
                            <th>#</th>
                            <th>Name</th>
                            <th>Index No.</th>
                            <th>Gender</th>
                            <th style={{ width: "5rem", textAlign: "right" }}>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {students.map((s, i) => (
                            <tr key={s.id}>
                              <td className="os-table__mono">{i + 1}</td>
                              <td>
                                <Link to={`/students/${s.id}`} className="os-table__link">
                                  {s.full_name}
                                </Link>
                                {s.id === cls.girl_monitor_id && (
                                  <Tag type="magenta" size="sm" style={{ marginLeft: "0.5rem" }}>
                                    Girl Monitor
                                  </Tag>
                                )}
                                {s.id === cls.boy_monitor_id && (
                                  <Tag type="blue" size="sm" style={{ marginLeft: "0.5rem" }}>
                                    Boy Monitor
                                  </Tag>
                                )}
                              </td>
                              <td className="os-table__mono">{s.index_number}</td>
                              <td className="os-table__muted">
                                {s.gender
                                  ? s.gender[0].toUpperCase() + s.gender.slice(1)
                                  : "—"}
                              </td>
                              <td style={{ textAlign: "right" }}>
                                <Button
                                  kind="danger--ghost"
                                  size="sm"
                                  onClick={() => setToUnenroll(s)}
                                >
                                  Remove
                                </Button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    ) : (
                      <EmptyState
                        title="No students enrolled"
                        description="Enrol a student from this school into the class."
                        action={
                          <Button renderIcon={Add} kind="primary" onClick={openEnrol}>
                            Enrol Student
                          </Button>
                        }
                      />
                    )}

                    <div
                      style={{
                        padding: "0.75rem 1.5rem",
                        borderTop: "1px solid #e0e0e0",
                        display: "flex",
                        alignItems: "center",
                        gap: "0.5rem",
                        fontSize: "0.8125rem",
                        color: "#525252",
                      }}
                    >
                      <UserMultiple size={14} style={{ fill: "#8d8d8d" }} />
                      {students?.length ?? 0} enrolled
                    </div>
                  </div>
                </TabPanel>

                {/* ── Attendance ───────────────────────────────────────── */}
                <TabPanel style={{ padding: 0 }}>
                  <div className="os-section" style={{ marginTop: "1rem" }}>
                    <div
                      className="os-section__header"
                      style={{ flexWrap: "wrap", rowGap: "0.75rem" }}
                    >
                      <h2 className="os-section__title">Attendance Sessions</h2>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "0.75rem",
                          flexWrap: "wrap",
                        }}
                      >
                        <div className="os-session-date-filter" style={{ flexShrink: 0 }}>
                          <DatePicker
                            datePickerType="single"
                            dateFormat="Y-m-d"
                            value={sessionDateFilter}
                            onChange={(dates) => {
                              setSessionDateFilter(dates[0] ? toYmd(dates[0]) : "");
                              setSessionPage(1);
                            }}
                          >
                            <DatePickerInput
                              id="session-date-filter"
                              labelText=""
                              placeholder="Filter by date"
                              size="sm"
                            />
                          </DatePicker>
                        </div>
                        {sessionDateFilter && (
                          <Button
                            kind="ghost"
                            size="sm"
                            onClick={() => {
                              setSessionDateFilter("");
                              setSessionPage(1);
                            }}
                          >
                            Clear
                          </Button>
                        )}
                        <Button renderIcon={Add} kind="ghost" size="sm" onClick={openNewSession}>
                          New Session
                        </Button>
                      </div>
                    </div>

                    {createSession.isError && (
                      <InlineNotification
                        kind="error"
                        title="Could not create session"
                        subtitle={apiError(
                          createSession.error,
                          "A session may already exist for this class on this date.",
                        )}
                        lowContrast
                        onClose={() => createSession.reset()}
                        style={{ maxWidth: "100%", margin: "0 1.5rem 1rem" }}
                      />
                    )}
                    {deleteSession.isError && (
                      <InlineNotification
                        kind="error"
                        title="Could not delete session"
                        subtitle={apiError(deleteSession.error, "Please try again.")}
                        lowContrast
                        onClose={() => deleteSession.reset()}
                        style={{ maxWidth: "100%", margin: "0 1.5rem 1rem" }}
                      />
                    )}

                    {sessionsLoading ? (
                      <LoadingSpinner />
                    ) : sortedSessions.length > 0 ? (
                      <>
                        <table className="os-table os-table--no-hover">
                          <thead>
                            <tr>
                              <th>Date</th>
                              <th style={{ width: "13rem", textAlign: "right" }}>Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {pagedSessions.map((s) => (
                              <tr key={s.id}>
                                <td className="os-table__mono">{s.date}</td>
                                <td>
                                  <div
                                    style={{
                                      display: "flex",
                                      flexWrap: "nowrap",
                                      gap: "0.25rem",
                                      justifyContent: "flex-end",
                                    }}
                                  >
                                    <Button
                                      kind="ghost"
                                      size="sm"
                                      as={Link}
                                      to={`/attendance/sessions/${s.id}/mark`}
                                      style={{ color: "#406AAF", whiteSpace: "nowrap" }}
                                    >
                                      Mark / View
                                    </Button>
                                    <Button
                                      kind="danger--ghost"
                                      size="sm"
                                      style={{ whiteSpace: "nowrap" }}
                                      onClick={() => setToDeleteSession(s)}
                                    >
                                      Delete
                                    </Button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                        <Pagination
                          totalItems={sortedSessions.length}
                          page={sessionPage}
                          pageSize={sessionPageSize}
                          pageSizes={[10, 20, 30]}
                          onChange={({ page, pageSize }) => {
                            setSessionPage(page);
                            setSessionPageSize(pageSize);
                          }}
                        />
                      </>
                    ) : (
                      <EmptyState
                        title={sessionDateFilter ? "No sessions on this date" : "No sessions yet"}
                        description={
                          sessionDateFilter
                            ? "Try a different date, or clear the filter."
                            : "Create a session to start taking attendance for this class."
                        }
                        action={
                          sessionDateFilter ? undefined : (
                            <Button renderIcon={Add} kind="primary" onClick={openNewSession}>
                              New Session
                            </Button>
                          )
                        }
                      />
                    )}
                  </div>
                </TabPanel>

                {/* ── Marks ────────────────────────────────────────────── */}
                <TabPanel style={{ padding: 0 }}>
                  <div style={{ marginTop: "1rem" }}>
                    <ClassMarks classId={id} academicYearId={cls.academic_year_id} />
                  </div>
                </TabPanel>

                {/* ── Details ──────────────────────────────────────────── */}
                <TabPanel style={{ padding: 0 }}>
                  <div className="os-section" style={{ marginTop: "1rem" }}>
                    <div className="os-section__header">
                      <h2 className="os-section__title">Class Information</h2>
                    </div>
                    <div className="os-kv-grid">
                      {[
                        ["Class Name", cls.name],
                        ["Grade", gradeName ?? "—"],
                        ["Stream", streamName ?? "None"],
                        ["Sub-stream", streamGroupName ?? "None"],
                        ["Academic Year", academicYearLabel ?? "—"],
                        ["Girl Monitor", girlMonitor?.full_name ?? "Unassigned"],
                        ["Boy Monitor", boyMonitor?.full_name ?? "Unassigned"],
                      ].map(([label, value]) => (
                        <div key={label} className="os-kv-item">
                          <p className="os-kv-item__label">{label}</p>
                          <p className="os-kv-item__value">{value}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="os-section">
                    <div className="os-section__header">
                      <h2 className="os-section__title">Class Teacher</h2>
                    </div>
                    <div className="os-section__body">
                      {formTeacher ? (
                        <Link
                          to={`/teachers/${formTeacher.id}`}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "0.75rem",
                            textDecoration: "none",
                          }}
                        >
                          <div
                            style={{
                              width: "2.25rem",
                              height: "2.25rem",
                              borderRadius: "50%",
                              background: "#406AAF",
                              color: "#fff",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              fontSize: "0.75rem",
                              fontWeight: 700,
                              flexShrink: 0,
                            }}
                          >
                            {initials(formTeacher.full_name)}
                          </div>
                          <div>
                            <p
                              style={{
                                margin: "0 0 0.1rem",
                                fontWeight: 600,
                                fontSize: "0.875rem",
                                color: "#161616",
                              }}
                            >
                              {formTeacher.full_name}
                            </p>
                            <p style={{ margin: 0, fontSize: "0.75rem", color: "#406AAF" }}>
                              View profile →
                            </p>
                          </div>
                        </Link>
                      ) : (
                        <span style={{ fontSize: "0.875rem", color: "#8d8d8d" }}>
                          No class teacher assigned.
                        </span>
                      )}
                    </div>
                  </div>
                </TabPanel>
              </TabPanels>
            </Tabs>
          </div>

          <div>
            <div className="os-section">
              <div className="os-section__header">
                <h2 className="os-section__title">Quick Info</h2>
              </div>
              <div className="os-section__body" style={{ padding: "0.75rem 1.5rem" }}>
                {[
                  ["Grade", gradeName ?? "—"],
                  ["Stream", streamName ?? "None"],
                  ["Enrolled", `${students?.length ?? 0}`],
                  ["Academic Year", academicYearLabel ?? "—"],
                ].map(([label, value]) => (
                  <div
                    key={label}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      padding: "0.5rem 0",
                      borderBottom: "1px solid #f4f4f4",
                      fontSize: "0.8125rem",
                    }}
                  >
                    <span style={{ color: "#525252" }}>{label}</span>
                    <span style={{ fontWeight: 500, color: "#161616" }}>{value}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="os-section">
              <div className="os-section__header">
                <h2 className="os-section__title">Attendance Summary</h2>
              </div>
              <div className="os-section__body" style={{ padding: "0.75rem 1.5rem" }}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    padding: "0.5rem 0",
                    fontSize: "0.8125rem",
                  }}
                >
                  <span style={{ color: "#525252" }}>Total sessions</span>
                  <span style={{ fontWeight: 600, color: "#161616" }}>
                    {sessions?.length ?? 0}
                  </span>
                </div>
                <div style={{ marginTop: "0.5rem" }}>
                  <Button
                    kind="ghost"
                    size="sm"
                    onClick={openNewSession}
                    style={{ color: "#406AAF", padding: 0 }}
                  >
                    <EventSchedule size={14} style={{ marginRight: "0.35rem" }} />
                    New session →
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Assign form teacher */}
      <ComposedModal open={editOpen} size="sm" onClose={() => setEditOpen(false)}>
        <ModalHeader title="Edit class" />
        <ModalBody>
          {updateClass.isError && (
            <InlineNotification
              kind="error"
              title="Error"
              subtitle={apiError(updateClass.error, "Failed to update class")}
              lowContrast
              hideCloseButton
              style={{ marginBottom: "1rem", maxWidth: "100%" }}
            />
          )}
          <TextInput
            id="class-name-edit"
            labelText="Class Name"
            value={nameEdit}
            maxLength={20}
            onChange={(e) => setNameEdit(e.target.value)}
          />
        </ModalBody>
        <ModalFooter>
          <Button kind="secondary" onClick={() => setEditOpen(false)}>
            Cancel
          </Button>
          <Button
            kind="primary"
            onClick={handleEditSave}
            disabled={!nameEdit.trim() || updateClass.isPending}
          >
            {updateClass.isPending ? "Saving…" : "Save"}
          </Button>
        </ModalFooter>
      </ComposedModal>

      <ComposedModal open={teacherModalOpen} size="sm" onClose={() => setTeacherModalOpen(false)}>
        <ModalHeader title="Assign class teacher" />
        <ModalBody>
          {assignFormTeacher.isError && (
            <InlineNotification
              kind="error"
              title="Error"
              subtitle={apiError(assignFormTeacher.error, "Failed to assign teacher")}
              lowContrast
              hideCloseButton
              style={{ marginBottom: "1rem", maxWidth: "100%" }}
            />
          )}
          <EntityCombobox
            id="teacher-choice"
            labelText="Teacher"
            items={teachers ?? []}
            selectedId={teacherChoice}
            onSelect={setTeacherChoice}
            getId={(t) => t.id}
            itemToString={(t) => `${t.full_name} — ${t.employee_number}`}
            placeholder="Search teachers by name or employee number…"
          />
        </ModalBody>
        <ModalFooter>
          <Button kind="secondary" onClick={() => setTeacherModalOpen(false)}>
            Cancel
          </Button>
          <Button
            kind="primary"
            onClick={handleAssignTeacher}
            disabled={!teacherChoice || assignFormTeacher.isPending}
          >
            {assignFormTeacher.isPending ? "Saving…" : "Assign"}
          </Button>
        </ModalFooter>
      </ComposedModal>

      <ComposedModal open={monitorsModalOpen} size="sm" onClose={() => setMonitorsModalOpen(false)}>
        <ModalHeader title="Assign class monitors" />
        <ModalBody>
          {assignMonitors.isError && (
            <InlineNotification
              kind="error"
              title="Error"
              subtitle={apiError(assignMonitors.error, "Failed to assign monitors")}
              lowContrast
              hideCloseButton
              style={{ marginBottom: "1rem", maxWidth: "100%" }}
            />
          )}
          <div style={{ display: "grid", gap: "1rem" }}>
            <EntityCombobox
              id="girl-monitor-choice"
              labelText="Girl Monitor"
              items={girlMonitorCandidates}
              selectedId={girlMonitorChoice}
              onSelect={setGirlMonitorChoice}
              getId={(s) => s.id}
              itemToString={(s) => `${s.full_name} — ${s.index_number}`}
              placeholder="Search students by name or index number…"
            />
            <EntityCombobox
              id="boy-monitor-choice"
              labelText="Boy Monitor"
              items={boyMonitorCandidates}
              selectedId={boyMonitorChoice}
              onSelect={setBoyMonitorChoice}
              getId={(s) => s.id}
              itemToString={(s) => `${s.full_name} — ${s.index_number}`}
              placeholder="Search students by name or index number…"
            />
          </div>
        </ModalBody>
        <ModalFooter>
          <Button kind="secondary" onClick={() => setMonitorsModalOpen(false)}>
            Cancel
          </Button>
          <Button kind="primary" onClick={handleAssignMonitors} disabled={assignMonitors.isPending}>
            {assignMonitors.isPending ? "Saving…" : "Save"}
          </Button>
        </ModalFooter>
      </ComposedModal>

      {/* Enrol student */}
      <ComposedModal open={enrolOpen} size="sm" onClose={() => setEnrolOpen(false)}>
        <ModalHeader title="Enrol student" />
        <ModalBody>
          {enrollStudent.isError && (
            <InlineNotification
              kind="error"
              title="Error"
              subtitle={apiError(enrollStudent.error, "Failed to enrol student")}
              lowContrast
              hideCloseButton
              style={{ marginBottom: "1rem", maxWidth: "100%" }}
            />
          )}
          {enrolCandidates.length === 0 ? (
            <p style={{ fontSize: "0.875rem" }}>
              Every student in the school is already enrolled in this class, or
              there are no students yet.
            </p>
          ) : (
            <EntityCombobox
              id="student-choice"
              labelText="Student"
              items={enrolCandidates}
              selectedId={studentChoice}
              onSelect={setStudentChoice}
              getId={(s) => s.id}
              itemToString={(s) => `${s.full_name} — ${s.index_number}`}
              placeholder="Search students by name or index number…"
            />
          )}
        </ModalBody>
        <ModalFooter>
          <Button kind="secondary" onClick={() => setEnrolOpen(false)}>
            Cancel
          </Button>
          <Button
            kind="primary"
            onClick={handleEnrol}
            disabled={!studentChoice || enrollStudent.isPending}
          >
            {enrollStudent.isPending ? "Enrolling…" : "Enrol"}
          </Button>
        </ModalFooter>
      </ComposedModal>

      {/* New attendance session */}
      <ComposedModal open={sessionOpen} size="sm" onClose={() => setSessionOpen(false)}>
        <ModalHeader title="New attendance session" />
        <ModalBody>
          {createSession.isError && (
            <InlineNotification
              kind="error"
              title="Error"
              subtitle={apiError(
                createSession.error,
                "A session may already exist for this class on this date.",
              )}
              lowContrast
              hideCloseButton
              style={{ marginBottom: "1rem", maxWidth: "100%" }}
            />
          )}
          <p style={{ fontSize: "0.875rem", color: "#525252", marginBottom: "1rem" }}>
            One session per class per day. Creating it takes you straight to
            marking attendance.
          </p>
          <DatePicker
            datePickerType="single"
            dateFormat="Y-m-d"
            value={sessionDate}
            onChange={(dates) => setSessionDate(toYmd(dates[0]))}
          >
            <DatePickerInput id="session-date" labelText="Date" placeholder="YYYY-MM-DD" />
          </DatePicker>
        </ModalBody>
        <ModalFooter>
          <Button kind="secondary" onClick={() => setSessionOpen(false)}>
            Cancel
          </Button>
          <Button
            kind="primary"
            onClick={handleCreateSession}
            disabled={!sessionDate || createSession.isPending}
          >
            {createSession.isPending ? "Creating…" : "Create"}
          </Button>
        </ModalFooter>
      </ComposedModal>

      <ConfirmDeleteModal
        open={!!toUnenroll}
        title="Remove student from class"
        description={
          <>
            Remove <strong>{toUnenroll?.full_name}</strong> from this class? Their
            student profile is not deleted.
          </>
        }
        isPending={unenrollStudent.isPending}
        onClose={() => setToUnenroll(null)}
        onConfirm={handleUnenrol}
      />

      <ConfirmDeleteModal
        open={!!toDeleteSession}
        title="Delete attendance session"
        description={
          <>
            Delete the session for <strong>{toDeleteSession?.date}</strong>? Every
            attendance record already marked for it is deleted too.
          </>
        }
        isPending={deleteSession.isPending}
        onClose={() => setToDeleteSession(null)}
        onConfirm={handleDeleteSession}
      />
    </div>
  );
}
