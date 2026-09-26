import { useMemo, useState } from "react";
import { useClass, useStreams, useStreamGroups } from "@/features/academics/queries/useClasses";
import { useGrades } from "@/features/academics/queries/useGrades";
import { useClassSessions } from "@/features/attendance/queries/useAttendance";
import { useMediums } from "@/features/curriculum/queries/useCurriculum";
import { useClassrooms } from "@/features/timetable/queries/useClassrooms";
import { useTeacher, useTeachers } from "@/features/teachers/queries/useTeachers";
import { useAcademicYears } from "@/features/school/queries/useAcademicYears";
import { useStudents, useStudentsByClass } from "@/features/students/queries/useStudents";

// Everything the class detail page reads, with ids resolved to display names.
export function useClassDetail(id: string) {
  const cls = useClass(id);
  const roster = useStudentsByClass(id);
  const sessions = useClassSessions(id);
  const { data: grades } = useGrades();
  const { data: streams } = useStreams();
  const { data: streamGroups } = useStreamGroups(cls.data?.stream_id ?? "");
  const { data: mediums } = useMediums();
  const { data: classrooms } = useClassrooms();
  const [teacherSearch, setTeacherSearch] = useState("");
  const { data: teacherPage } = useTeachers({ limit: 25, search: teacherSearch });
  const teachers = teacherPage?.items;
  // The class's current form teacher, looked up independently of the
  // search-scoped `teachers` list above (a name lookup by id, not a
  // picker - the "Assign/Change Teacher" picker always starts blank, so
  // it never needs the incumbent pre-selected).
  const { data: formTeacher } = useTeacher(cls.data?.form_teacher_id ?? "");
  const { data: years } = useAcademicYears();
  // The "enrol student" picker always starts blank (no pre-selection to
  // preserve), so it's safe to search-scope directly.
  const [studentSearch, setStudentSearch] = useState("");
  const { data: allStudentsPage } = useStudents({ limit: 25, search: studentSearch });

  const students = useMemo(() => roster.data ?? [], [roster.data]);
  const c = cls.data;
  const enrolledIds = useMemo(() => new Set(students.map((s) => s.id)), [students]);
  const enrolCandidates = useMemo(
    () => (allStudentsPage?.items ?? []).filter((s) => !enrolledIds.has(s.id)),
    [allStudentsPage, enrolledIds],
  );

  return {
    cls,
    roster,
    sessions,
    mediums,
    classrooms,
    teachers,
    onTeacherSearch: setTeacherSearch,
    onStudentSearch: setStudentSearch,
    names: {
      grade: grades?.find((g) => g.id === c?.grade_id)?.name,
      stream: streams?.find((s) => s.id === c?.stream_id)?.name,
      streamGroup: streamGroups?.find((g) => g.id === c?.stream_group_id)?.name,
      medium: mediums?.find((m) => m.id === c?.medium_id)?.name,
      homeClassroom: classrooms?.find((r) => r.id === c?.home_classroom_id)?.name,
      academicYear: years?.find((y) => y.id === c?.academic_year_id)?.label,
    },
    formTeacher,
    girlMonitor: students.find((s) => s.id === c?.girl_monitor_id),
    boyMonitor: students.find((s) => s.id === c?.boy_monitor_id),
    girlMonitorCandidates: students.filter((s) => s.gender !== "male"),
    boyMonitorCandidates: students.filter((s) => s.gender !== "female"),
    enrolCandidates,
  };
}
