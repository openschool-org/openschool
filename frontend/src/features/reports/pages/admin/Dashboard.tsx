import { useSchool } from "@/features/school/queries/useSchool";
import { useStudents } from "@/features/students/queries/useStudents";
import { useTeachers } from "@/features/teachers/queries/useTeachers";
import { useDashboardAnalytics } from "@/features/reports/queries/useDashboardAnalytics";
import { useCurrentClasses } from "@/features/academics/queries/useClasses";
import { useGrades } from "@/features/academics/queries/useGrades";
import { useSubjects } from "@/features/curriculum/queries/useSubjects";
import { useAcademicYears } from "@/features/school/queries/useAcademicYears";
import { useDailySessions } from "@/features/attendance/queries/useAttendance";
import { useStaffAttendanceByDate } from "@/features/attendance/queries/useStaffAttendance";
import type { DailySession } from "@/features/attendance/api/attendance";
import { todayISODate } from "@/shared/lib/date";
import { Add, ArrowRight, Calendar, UserMultiple, Education, Building, Book } from "@carbon/icons-react";
import { Button } from "@carbon/react";
import { Link } from "react-router";
import StatCard from "@/features/reports/components/dashboard/StatCard";
import AttendanceByClassSection from "@/features/reports/components/dashboard/AttendanceByClassSection";
import DashboardSnapshotSection from "@/features/reports/components/dashboard/DashboardSnapshotSection";
import RecentActivitySection from "@/features/reports/components/dashboard/RecentActivitySection";
import SetupChecklistCard from "@/features/reports/components/dashboard/SetupChecklistCard";
import { useMemo } from "react";

export default function Dashboard() {
  const { data: school } = useSchool();
  // Only `total` is used from these two - a small limit keeps the request
  // light since the page doesn't render any of the individual rows.
  const { data: studentPage, isLoading: studentsLoading } = useStudents({ limit: 1 });
  const studentCount = studentPage?.total ?? 0;
  const { data: teacherPage, isLoading: teachersLoading } = useTeachers({ limit: 1 });
  const teacherCount = teacherPage?.total ?? 0;
  // The activity feed comes from a dedicated, server-sorted (created_at
  // DESC) query on the backend (dashboard.Service.recentActivity), not a
  // client-side slice of a capped, alphabetically-sorted list page - the
  // latter could miss a recently enrolled student/teacher once more than
  // one page of records exists.
  const { data: analytics, isLoading: analyticsLoading } = useDashboardAnalytics();
  const recentActivity = analytics?.school.recent_activity ?? [];
  const { data: classes, isLoading: classesLoading } = useCurrentClasses();
  const { data: grades, isLoading: gradesLoading } = useGrades();
  const { data: subjects, isLoading: subjectsLoading } = useSubjects();
  const { data: years } = useAcademicYears();
  const { data: todaySessions, isLoading: sessionsLoading } = useDailySessions(todayISODate());
  const { data: staffAttendance, isLoading: staffAttendanceLoading } = useStaffAttendanceByDate(todayISODate());

  const title = school?.name ?? "Admin dashboard";
  const currentYear = years?.find((y) => y.is_current) ?? null;

  const sessionByClassId = useMemo(() => {
    const map = new Map<string, DailySession>();
    for (const s of todaySessions ?? []) map.set(s.class_id, s);
    return map;
  }, [todaySessions]);

  const classAttendanceLoading = classesLoading || sessionsLoading;

  const setupLoading = classesLoading || gradesLoading || subjectsLoading || teachersLoading || studentsLoading;
  const setupItems = [
    { label: "Set a current academic year", done: !!currentYear, path: "/academic-years" },
    { label: "Add a grade", done: (grades?.length ?? 0) > 0, path: "/classes" },
    { label: "Add a subject", done: (subjects?.length ?? 0) > 0, path: "/subjects" },
    { label: "Add a teacher", done: teacherCount > 0, path: "/teachers" },
    { label: "Add a class", done: (classes?.length ?? 0) > 0, path: "/classes" },
    { label: "Add a student", done: studentCount > 0, path: "/students" },
  ];

  return (
    <div className="os-page">
      <div className="os-dashboard-hero">
        <div className="os-dashboard-hero__copy">
          <p className="os-eyebrow">School overview</p>
          <h1 className="os-page__title">{title}</h1>
          <p className="os-page__subtitle">A quick view of what is happening across your school today.</p>
        </div>

        <div className="os-dashboard-hero__aside">
          {currentYear && (
            <div className="os-year-pill">
              <Calendar size={16} className="os-shrink-0" />
              <span><strong>{currentYear.label}</strong><small>Current academic year</small></span>
            </div>
          )}
          {school?.logo_url && (
            <img
              src={school.logo_url}
              alt={school.name ?? "School logo"} className="os-w-3 os-h-3 os-object-contain os-shrink-0"
            />
          )}
        </div>
      </div>

      <div className="os-dashboard-actions" aria-label="Quick actions">
        <Button as={Link} to="/students/new" kind="primary" size="md" renderIcon={Add}>Add student</Button>
        <Button as={Link} to="/classes/new" kind="tertiary" size="md" renderIcon={Building}>Create class</Button>
        <Button as={Link} to="/attendance" kind="tertiary" size="md" renderIcon={Calendar}>Take attendance</Button>
        <Button as={Link} to="/analytics" kind="ghost" size="md" renderIcon={ArrowRight}>View analytics</Button>
      </div>

      {!setupLoading && <SetupChecklistCard items={setupItems} />}

      <div className="os-stat-grid">
        <StatCard label="Total students" value={studentCount} loading={studentsLoading} Icon={UserMultiple} path="/students" />
        <StatCard label="Teachers" value={teacherCount} loading={teachersLoading} Icon={Education} path="/teachers" />
        <StatCard label="Classes" value={classes?.length ?? 0} loading={classesLoading} Icon={Building} path="/classes" />
        <StatCard label="Subjects" value={subjects?.length ?? 0} loading={subjectsLoading} Icon={Book} path="/subjects" />
      </div>

      <div className="os-dashboard-lower-grid">
        <AttendanceByClassSection
          classes={classes}
          loading={classAttendanceLoading}
          sessionByClassId={sessionByClassId}
        />

        <DashboardSnapshotSection
          teachers={staffAttendance?.teachers}
          teachersLoading={staffAttendanceLoading}
        />
      </div>

      <div className="os-dashboard-recent">
        <RecentActivitySection items={recentActivity} loading={analyticsLoading} />
      </div>
    </div>
  );
}
