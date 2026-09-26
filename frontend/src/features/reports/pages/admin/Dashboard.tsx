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
import { todayISODate, formatMonth } from "@/shared/lib/date";
import { Calendar, UserMultiple, Education, Building, Book } from "@carbon/icons-react";
import StatCard from "@/features/reports/components/dashboard/StatCard";
import AttendanceByClassSection from "@/features/reports/components/dashboard/AttendanceByClassSection";
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
  const recentActivity = useMemo(() => analytics?.school.recent_activity ?? [], [analytics]);
  const { data: classes, isLoading: classesLoading } = useCurrentClasses();
  const { data: grades, isLoading: gradesLoading } = useGrades();
  const { data: subjects, isLoading: subjectsLoading } = useSubjects();
  const { data: years } = useAcademicYears();
  const { data: todaySessions, isLoading: sessionsLoading } = useDailySessions(todayISODate());
  const { data: staffAttendance, isLoading: staffAttendanceLoading } = useStaffAttendanceByDate(todayISODate());

  const title = school?.name ? `${school.name} - Admin Dashboard` : "Admin dashboard";
  const currentYear = years?.find((y) => y.is_current) ?? null;

  const dashboardLoading = analyticsLoading;

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
      <div className="os-page__header os-wrap os-row-gap-3">
        <div className="os-page__header-left">
          <h1 className="os-page__title">{title}</h1>
        </div>

        <div className="os-flex os-items-center os-gap-4">
          {currentYear && (
            <div className="os-flex os-items-center os-gap-2 os-py-2 os-px-3h os-bg-accent-light os-rounded-full"
            >
              <Calendar size={16} className="os-shrink-0" />
              <span className="os-fw-600 os-text-sm os-c-primary">
                {currentYear.label}
              </span>
              {currentYear.start_date && currentYear.end_date && (
                <span className="os-text-xs os-c-secondary">
                  {formatMonth(currentYear.start_date)}
                  {" – "}
                  {formatMonth(currentYear.end_date)}
                </span>
              )}
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

      {!setupLoading && <SetupChecklistCard items={setupItems} />}

      <div className="os-stat-grid">
        <StatCard label="Total students" value={studentCount} loading={studentsLoading} Icon={UserMultiple} path="/students" />
        <StatCard label="Teachers" value={teacherCount} loading={teachersLoading} Icon={Education} path="/teachers" />
        <StatCard label="Classes" value={classes?.length ?? 0} loading={classesLoading} Icon={Building} path="/classes" />
        <StatCard label="Subjects" value={subjects?.length ?? 0} loading={subjectsLoading} Icon={Book} path="/subjects" />
      </div>

      <AttendanceByClassSection
        classes={classes}
        loading={classAttendanceLoading}
        sessionByClassId={sessionByClassId}
        teachers={staffAttendance?.teachers}
        teachersLoading={staffAttendanceLoading}
      />

      <RecentActivitySection items={recentActivity} loading={dashboardLoading} />
    </div>
  );
}
