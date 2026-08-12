import { useMemo } from "react";
import { UserMultiple, Education, Building, Book } from "@carbon/icons-react";
import { useSchool } from "../../../queries/useSchool";
import { useStudents } from "../../../queries/useStudents";
import { useTeachers } from "../../../queries/useTeachers";
import { useCurrentClasses } from "../../../queries/useClasses";
import { useSubjects } from "../../../queries/useSubjects";
import { useAcademicYears } from "../../../queries/useAcademicYears";
import { useDailySessions } from "../../../queries/useAttendance";
import type { DailySession } from "../../../services/attendance";
import AnalyticsSection from "./AnalyticsSection";
import { todayISODate } from "../../../lib/date";
import StatCard from "./components/StatCard";
import AttendanceByClassSection from "./components/AttendanceByClassSection";
import RecentActivitySection, { type RecentActivityItem } from "./components/RecentActivitySection";
import AttendanceTodaySidebar from "./components/AttendanceTodaySidebar";
import AcademicYearSidebar from "./components/AcademicYearSidebar";

export default function Dashboard() {
  const { data: school } = useSchool();
  const { data: students, isLoading: studentsLoading } = useStudents();
  const { data: teachers, isLoading: teachersLoading } = useTeachers();
  const { data: classes, isLoading: classesLoading } = useCurrentClasses();
  const { data: subjects, isLoading: subjectsLoading } = useSubjects();
  const { data: years, isLoading: yearsLoading } = useAcademicYears();
  const { data: todaySessions, isLoading: sessionsLoading } = useDailySessions(todayISODate());

  const title = school?.name ? `${school.name} - Admin Dashboard` : "Admin Dashboard";
  const currentYear = years?.find((y) => y.is_current) ?? null;

  const recentActivity = useMemo(() => {
    const items: RecentActivityItem[] = [];
    for (const s of students ?? []) {
      if (!s.created_at) continue;
      items.push({
        key: `student-${s.id}`,
        text: `${s.full_name} enrolled`,
        sub: [s.grade_name, s.class_name, s.index_number].filter(Boolean).join(" · "),
        time: s.created_at,
        path: `/students/${s.id}`,
        kind: "student",
      });
    }
    for (const t of teachers ?? []) {
      if (!t.created_at) continue;
      items.push({
        key: `teacher-${t.id}`,
        text: `${t.full_name} added as a teacher`,
        sub: t.employee_number,
        time: t.created_at,
        path: `/teachers/${t.id}`,
        kind: "teacher",
      });
    }
    return items.sort((a, b) => b.time.localeCompare(a.time)).slice(0, 6);
  }, [students, teachers]);

  const dashboardLoading = studentsLoading || teachersLoading;

  const sessionByClassId = useMemo(() => {
    const map = new Map<string, DailySession>();
    for (const s of todaySessions ?? []) map.set(s.class_id, s);
    return map;
  }, [todaySessions]);

  const classAttendanceLoading = classesLoading || sessionsLoading;

  return (
    <div className="os-page">
      <div className="os-page__header">
        <div className="os-page__header-left">
          <h1 className="os-page__title">{title}</h1>
        </div>
        {school?.logo_url && (
          <img
            src={school.logo_url}
            alt={school.name ?? "School logo"}
            style={{ width: "3rem", height: "3rem", objectFit: "contain", flexShrink: 0 }}
          />
        )}
      </div>

      {/* Stat cards */}
      <div className="os-stat-grid">
        <StatCard label="Total Students" value={students?.length ?? 0} loading={studentsLoading} Icon={UserMultiple} path="/students" />
        <StatCard label="Teachers" value={teachers?.length ?? 0} loading={teachersLoading} Icon={Education} path="/teachers" />
        <StatCard label="Classes" value={classes?.length ?? 0} loading={classesLoading} Icon={Building} path="/classes" />
        <StatCard label="Subjects" value={subjects?.length ?? 0} loading={subjectsLoading} Icon={Book} path="/subjects" />
      </div>

      <AttendanceByClassSection classes={classes} loading={classAttendanceLoading} sessionByClassId={sessionByClassId} />

      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "1.5rem", alignItems: "start" }}>
        <div>
          <RecentActivitySection items={recentActivity} loading={dashboardLoading} />
        </div>

        {/* Right sidebar */}
        <div>
          <AttendanceTodaySidebar sessions={todaySessions} loading={sessionsLoading} />
          <AcademicYearSidebar currentYear={currentYear} loading={yearsLoading} />
        </div>
      </div>

      <AnalyticsSection />
    </div>
  );
}
