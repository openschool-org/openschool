// This file renders the ClassDetail page, displaying classroom details, enrolled students, attendance sessions, term marks, and assigned subject teachers.

import { useMemo, useState } from "react";
import { Link, useParams, useLocation } from "react-router";
import { Button, Tag, Tabs, Tab, TabList, TabPanels, TabPanel } from "@carbon/react";
import { ArrowLeft, Edit, UserMultiple, EventSchedule, UserFollow } from "@carbon/icons-react";
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
import { useMediums } from "../../../queries/useCurriculum";
import { useClassrooms } from "../../../queries/timetable/useClassrooms";
import { useTeachers } from "../../../queries/useTeachers";
import { useAcademicYears } from "../../../queries/useAcademicYears";
import { useStudents } from "../../../queries/useStudents";
import type { Student } from "../../../services/student";
import type { AttendanceSession } from "../../../services/attendance";
import LoadingSpinner from "../../../components/common/LoadingSpinner";
import ErrorMessage from "../../../components/common/ErrorMessage";
import ConfirmDeleteModal from "../../../components/common/ConfirmDeleteModal";
import ClassMarks from "./ClassMarks";
import StudentsTab from "./components/StudentsTab";
import AttendanceTab from "./components/AttendanceTab";
import DetailsTab from "./components/DetailsTab";
import EditClassModal from "./components/EditClassModal";
import AssignTeacherModal from "./components/AssignTeacherModal";
import AssignMonitorsModal from "./components/AssignMonitorsModal";
import EnrolStudentModal from "./components/EnrolStudentModal";
import NewSessionModal from "./components/NewSessionModal";
import SubjectsTab from "./components/SubjectsTab";
import { todayISODate } from "../../../lib/date";

function formatClassLabel(name: string) {
  const m = name.match(/^(\d+)([^\d-].*)$/);
  return m ? `${m[1]}-${m[2]}` : name;
}

export default function ClassDetail() {
  const { id = "" } = useParams();
  const location = useLocation();
  const initialTab = (location.state as { tab?: string } | null)?.tab === "attendance" ? 1 : 0;

  const { data: cls, isLoading, isError, refetch } = useClass(id);
  const { data: students, isLoading: studentsLoading } = useClassStudents(id);
  const { data: sessions, isLoading: sessionsLoading } = useClassSessions(id);
  const { data: grades } = useGrades();
  const { data: streams } = useStreams();
  const { data: streamGroups } = useStreamGroups(cls?.stream_id ?? "");
  const { data: mediums } = useMediums();
  const { data: classrooms } = useClassrooms();
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
  const [mediumEdit, setMediumEdit] = useState("");
  const [homeClassroomEdit, setHomeClassroomEdit] = useState("");
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

  const gradeName = grades?.find((g) => g.id === cls?.grade_id)?.name;
  const streamName = streams?.find((s) => s.id === cls?.stream_id)?.name;
  const streamGroupName = streamGroups?.find((g) => g.id === cls?.stream_group_id)?.name;
  const mediumName = mediums?.find((m) => m.id === cls?.medium_id)?.name;
  const homeClassroomName = classrooms?.find((c) => c.id === cls?.home_classroom_id)?.name;
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

  // Sri Lankan schools usually name a class's homeroom the same as the
  // class itself (e.g. class "13-M1" sits in room "13-M1") — suggest that
  // match automatically while editing, but let the admin override it.
  const suggestedHomeClassroom = nameEdit.trim()
    ? classrooms?.find((c) => c.room_type === "regular" && c.name.trim().toLowerCase() === nameEdit.trim().toLowerCase())
    : undefined;
  const effectiveHomeClassroomEdit = homeClassroomEdit || suggestedHomeClassroom?.id || "";

  const openEdit = () => {
    updateClass.reset();
    setNameEdit(cls?.name ?? "");
    setMediumEdit(cls?.medium_id ?? "");
    setHomeClassroomEdit(cls?.home_classroom_id ?? "");
    setEditOpen(true);
  };

  const handleEditSave = () => {
    const name = nameEdit.trim();
    if (!name) return;
    updateClass.mutate(
      {
        name,
        form_teacher_id: cls?.form_teacher_id ?? null,
        medium_id: mediumEdit || null,
        home_classroom_id: effectiveHomeClassroomEdit || null,
      },
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

  const openNewSession = () => {
    createSession.reset();
    setSessionDate(todayISODate());
    setSessionOpen(true);
  };

  const handleCreateSession = () => {
    createSession.mutate(
      { class_id: id, date: sessionDate },
      { onSuccess: () => setSessionOpen(false) },
    );
  };

  const handleUnenrol = () => {
    if (!toUnenroll) return;
    unenrollStudent.mutate(toUnenroll.id, {
      onSuccess: () => setToUnenroll(null),
    });
  };

  const handleDeleteSession = () => {
    if (!toDeleteSession) return;
    deleteSession.mutate(toDeleteSession.id, {
      onSuccess: () => setToDeleteSession(null),
    });
  };

  if (isLoading) return <LoadingSpinner />;
  if (isError || !cls) {
    return (
      <div style={{ padding: "2rem" }}>
        <ErrorMessage message="Failed to load classroom details" onRetry={refetch} />
      </div>
    );
  }

  const metaParts = [];
  if (academicYearLabel) metaParts.push(academicYearLabel);
  if (formTeacher) metaParts.push(`Form teacher: ${formTeacher.full_name}`);

  return (
    <div style={{ background: "#f4f4f4", minHeight: "calc(100vh - 3rem)" }}>
      <div className="os-profile__banner">
        <div className="os-profile__avatar">
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
          {mediumName && (
            <Tag type="purple" size="sm">
              {mediumName}
            </Tag>
          )}
          {homeClassroomName && (
            <Tag type="teal" size="sm">
              {homeClassroomName}
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
                <Tab>Subjects & Teachers</Tab>
                <Tab>Details</Tab>
              </TabList>
              <TabPanels>
                <TabPanel style={{ padding: 0 }}>
                  <StudentsTab
                    cls={cls}
                    students={students}
                    studentsLoading={studentsLoading}
                    unenrollStudent={unenrollStudent}
                    onOpenEnrol={openEnrol}
                    onRequestUnenroll={setToUnenroll}
                  />
                </TabPanel>

                <TabPanel style={{ padding: 0 }}>
                  <AttendanceTab
                    sessions={sessions}
                    sessionsLoading={sessionsLoading}
                    createSession={createSession}
                    deleteSession={deleteSession}
                    onOpenNewSession={openNewSession}
                    onRequestDeleteSession={setToDeleteSession}
                  />
                </TabPanel>

                <TabPanel style={{ padding: 0 }}>
                  <div style={{ marginTop: "1rem" }}>
                    <ClassMarks classId={id} academicYearId={cls.academic_year_id} />
                  </div>
                </TabPanel>

                <TabPanel style={{ padding: 0 }}>
                  <SubjectsTab classId={id} />
                </TabPanel>

                <TabPanel style={{ padding: 0 }}>
                  <DetailsTab
                    cls={cls}
                    gradeName={gradeName}
                    streamName={streamName}
                    streamGroupName={streamGroupName}
                    mediumName={mediumName}
                    homeClassroomName={homeClassroomName}
                    academicYearLabel={academicYearLabel}
                    girlMonitor={girlMonitor}
                    boyMonitor={boyMonitor}
                    formTeacher={formTeacher}
                  />
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
                  ["Medium", mediumName ?? "Not designated"],
                  ["Home Classroom", homeClassroomName ?? "Not assigned"],
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

      <EditClassModal
        open={editOpen}
        nameEdit={nameEdit}
        onNameEditChange={setNameEdit}
        mediumEdit={mediumEdit}
        onMediumEditChange={setMediumEdit}
        mediums={mediums}
        homeClassroomEdit={effectiveHomeClassroomEdit}
        onHomeClassroomEditChange={setHomeClassroomEdit}
        classrooms={classrooms}
        updateClass={updateClass}
        onClose={() => setEditOpen(false)}
        onSave={handleEditSave}
      />

      <AssignTeacherModal
        open={teacherModalOpen}
        teachers={teachers}
        teacherChoice={teacherChoice}
        onTeacherChoiceChange={setTeacherChoice}
        assignFormTeacher={assignFormTeacher}
        onClose={() => setTeacherModalOpen(false)}
        onAssign={handleAssignTeacher}
      />

      <AssignMonitorsModal
        open={monitorsModalOpen}
        girlMonitorCandidates={girlMonitorCandidates}
        boyMonitorCandidates={boyMonitorCandidates}
        girlMonitorChoice={girlMonitorChoice}
        onGirlMonitorChoiceChange={setGirlMonitorChoice}
        boyMonitorChoice={boyMonitorChoice}
        onBoyMonitorChoiceChange={setBoyMonitorChoice}
        assignMonitors={assignMonitors}
        onClose={() => setMonitorsModalOpen(false)}
        onSave={handleAssignMonitors}
      />

      <EnrolStudentModal
        open={enrolOpen}
        enrolCandidates={enrolCandidates}
        studentChoice={studentChoice}
        onStudentChoiceChange={setStudentChoice}
        enrollStudent={enrollStudent}
        onClose={() => setEnrolOpen(false)}
        onEnrol={handleEnrol}
      />

      <NewSessionModal
        open={sessionOpen}
        sessionDate={sessionDate}
        onSessionDateChange={setSessionDate}
        createSession={createSession}
        onClose={() => setSessionOpen(false)}
        onCreate={handleCreateSession}
      />

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
