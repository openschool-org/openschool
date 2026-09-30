import { useState } from "react";
import type { ClassRow } from "@/features/academics/api/class";
import type { Student } from "@/features/students/api/student";
import type { AttendanceSession } from "@/features/attendance/api/attendance";
import { useUpdateClass, useAssignFormTeacher, useAssignMonitors, useEnrollStudent, useUnenrollStudent } from "@/features/academics/queries/useClasses";
import { useCreateSession, useDeleteSession } from "@/features/attendance/queries/useAttendance";
import { useClassDetail } from "@/features/academics/hooks/useClassDetail";
import EditClassModal from "@/features/academics/components/EditClassModal";
import AssignTeacherModal from "@/features/academics/components/AssignTeacherModal";
import AssignMonitorsModal from "@/features/academics/components/AssignMonitorsModal";
import EnrolStudentModal from "@/features/academics/components/EnrolStudentModal";
import NewSessionModal from "@/features/academics/components/NewSessionModal";
import ConfirmDeleteModal from "@/shared/ui/ConfirmDeleteModal";
import { todayISODate } from "@/shared/lib/date";
import { suggestHomeClassroom } from "@/features/timetable/lib/classroom";
import { displayName } from "@/shared/lib/name";

type Detail = ReturnType<typeof useClassDetail>;

// Owns the state and mutations for every modal on the class detail page.
export function useClassDetailModals(id: string, cls: ClassRow | undefined, detail: Detail) {
  const updateClass = useUpdateClass(id);
  const assignFormTeacher = useAssignFormTeacher(id);
  const assignMonitors = useAssignMonitors(id);
  const enrollStudent = useEnrollStudent(id);
  const unenrollStudent = useUnenrollStudent(id);
  const createSession = useCreateSession();
  const deleteSession = useDeleteSession();

  const [editOpen, setEditOpen] = useState(false);
  const [nameEdit, setNameEdit] = useState("");
  const [mediumEdit, setMediumEdit] = useState("");
  const [homeClassroomEdit, setHomeClassroomEdit] = useState("");
  const [teacherOpen, setTeacherOpen] = useState(false);
  const [teacherChoice, setTeacherChoice] = useState("");
  const [monitorsOpen, setMonitorsOpen] = useState(false);
  const [girlChoice, setGirlChoice] = useState("");
  const [boyChoice, setBoyChoice] = useState("");
  const [enrolOpen, setEnrolOpen] = useState(false);
  const [studentChoice, setStudentChoice] = useState("");
  const [sessionOpen, setSessionOpen] = useState(false);
  const [sessionDate, setSessionDate] = useState(todayISODate());
  const [toUnenroll, setToUnenroll] = useState<Student | null>(null);
  const [toDeleteSession, setToDeleteSession] = useState<AttendanceSession | null>(null);

  const effectiveHomeClassroom = homeClassroomEdit || suggestHomeClassroom(detail.classrooms, nameEdit)?.id || "";

  const openEdit = () => {
    updateClass.reset();
    setNameEdit(cls?.name ?? "");
    setMediumEdit(cls?.medium_id ?? "");
    setHomeClassroomEdit(cls?.home_classroom_id ?? "");
    setEditOpen(true);
  };
  const openTeacher = () => {
    assignFormTeacher.reset();
    detail.onTeacherSearch("");
    setTeacherChoice("");
    setTeacherOpen(true);
  };
  const openMonitors = () => {
    assignMonitors.reset();
    setGirlChoice(cls?.girl_monitor_id ?? "");
    setBoyChoice(cls?.boy_monitor_id ?? "");
    setMonitorsOpen(true);
  };
  const openEnrol = () => {
    enrollStudent.reset();
    setStudentChoice("");
    setEnrolOpen(true);
  };
  const openNewSession = () => {
    createSession.reset();
    setSessionDate(todayISODate());
    setSessionOpen(true);
  };

  const modals = (
    <>
      <EditClassModal
        open={editOpen}
        nameEdit={nameEdit}
        onNameEditChange={setNameEdit}
        mediumEdit={mediumEdit}
        onMediumEditChange={setMediumEdit}
        mediums={detail.mediums}
        homeClassroomEdit={effectiveHomeClassroom}
        onHomeClassroomEditChange={setHomeClassroomEdit}
        classrooms={detail.classrooms}
        updateClass={updateClass}
        onClose={() => setEditOpen(false)}
        onSave={() => {
          const name = nameEdit.trim();
          if (!name) return;
          updateClass.mutate(
            { name, form_teacher_id: cls?.form_teacher_id ?? null, medium_id: mediumEdit || null, home_classroom_id: effectiveHomeClassroom || null },
            { onSuccess: () => setEditOpen(false) },
          );
        }}
      />
      <AssignTeacherModal
        open={teacherOpen}
        teachers={detail.teachers}
        onTeacherSearch={detail.onTeacherSearch}
        teacherChoice={teacherChoice}
        onTeacherChoiceChange={setTeacherChoice}
        assignFormTeacher={assignFormTeacher}
        onClose={() => setTeacherOpen(false)}
        onAssign={() => teacherChoice && assignFormTeacher.mutate(teacherChoice, { onSuccess: () => setTeacherOpen(false) })}
      />
      <AssignMonitorsModal
        open={monitorsOpen}
        girlMonitorCandidates={detail.girlMonitorCandidates}
        boyMonitorCandidates={detail.boyMonitorCandidates}
        girlMonitorChoice={girlChoice}
        onGirlMonitorChoiceChange={setGirlChoice}
        boyMonitorChoice={boyChoice}
        onBoyMonitorChoiceChange={setBoyChoice}
        assignMonitors={assignMonitors}
        onClose={() => setMonitorsOpen(false)}
        onSave={() => assignMonitors.mutate({ girl_monitor_id: girlChoice || null, boy_monitor_id: boyChoice || null }, { onSuccess: () => setMonitorsOpen(false) })}
      />
      <EnrolStudentModal
        open={enrolOpen}
        enrolCandidates={detail.enrolCandidates}
        onStudentSearch={detail.onStudentSearch}
        studentChoice={studentChoice}
        onStudentChoiceChange={setStudentChoice}
        enrollStudent={enrollStudent}
        onClose={() => setEnrolOpen(false)}
        onEnrol={() => studentChoice && enrollStudent.mutate(studentChoice, { onSuccess: () => setEnrolOpen(false) })}
      />
      <NewSessionModal
        open={sessionOpen}
        sessionDate={sessionDate}
        onSessionDateChange={setSessionDate}
        createSession={createSession}
        onClose={() => setSessionOpen(false)}
        onCreate={() => createSession.mutate({ class_id: id, date: sessionDate }, { onSuccess: () => setSessionOpen(false) })}
      />
      <ConfirmDeleteModal
        open={!!toUnenroll}
        title="Remove student from class"
        description={<>Remove <strong>{toUnenroll && displayName(toUnenroll)}</strong> from this class? Their student profile is not deleted.</>}
        subject="Student"
        successVerb="removed"
        mutation={unenrollStudent}
        onClose={() => setToUnenroll(null)}
        onConfirm={() => toUnenroll && unenrollStudent.mutate(toUnenroll.id)}
      />
      <ConfirmDeleteModal
        open={!!toDeleteSession}
        title="Delete attendance session"
        description={<>Delete the session for <strong>{toDeleteSession?.date}</strong>? Every attendance record already marked for it is deleted too.</>}
        subject="Attendance session"
        mutation={deleteSession}
        onClose={() => setToDeleteSession(null)}
        onConfirm={() => toDeleteSession && deleteSession.mutate(toDeleteSession.id)}
      />
    </>
  );

  return { modals, openEdit, openTeacher, openMonitors, openEnrol, openNewSession, setToUnenroll, setToDeleteSession, unenrollStudent, createSession, deleteSession };
}
