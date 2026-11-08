import { useSchool } from "@/features/school/queries/useSchool";
import { useStudents } from "@/features/students/queries/useStudents";
import { useTeachers } from "@/features/teachers/queries/useTeachers";
import { useDashboardAnalytics } from "@/features/reports/queries/useDashboardAnalytics";
import { useCurrentClasses } from "@/features/academics/queries/useClasses";
import { useGrades } from "@/features/academics/queries/useGrades";
import { useSubjects } from "@/features/curriculum/queries/useSubjects";
import { useAcademicYears } from "@/features/school/queries/useAcademicYears";
import { useTerms } from "@/features/school/queries/useTerms";
import { useDailySessions } from "@/features/attendance/queries/useAttendance";
import { useStaffAttendanceByDate } from "@/features/attendance/queries/useStaffAttendance";
import type { DailySession } from "@/features/attendance/api/attendance";
import { todayISODate } from "@/shared/lib/date";
import { UserMultiple, Education, Building, Book } from "@carbon/icons-react";
import { ArrowRightOutlined, BankOutlined, CalendarOutlined, PlusOutlined } from "@ant-design/icons";
import LinkButton from "@/shared/ui/LinkButton";
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
  const { data: years, isLoading: yearsLoading } = useAcademicYears();
  const currentYear = years?.find((y) => y.is_current) ?? null;
  const { data: terms, isPending: termsPending, isError: termsError } = useTerms(currentYear?.id);
  const { data: todaySessions, isLoading: sessionsLoading } = useDailySessions(todayISODate());
  const { data: staffAttendance, isLoading: staffAttendanceLoading } = useStaffAttendanceByDate(todayISODate());

  const title = school?.name ?? "Admin dashboard";
  const sessionByClassId = useMemo(() => {
    const map = new Map<string, DailySession>();
    for (const s of todaySessions ?? []) map.set(s.class_id, s);
    return map;
  }, [todaySessions]);

  const classAttendanceLoading = classesLoading || sessionsLoading;

  // Terms only start loading once the current year is known, so wait for both before judging "Set up terms".
  const termsLoading = yearsLoading || (!!currentYear && termsPending);
  const setupLoading = classesLoading || gradesLoading || subjectsLoading || teachersLoading || studentsLoading || termsLoading;
  const setupItems = [
    { label: "Set a current academic year", done: !!currentYear, path: "/academic-years" },
    { label: "Set up terms", done: !!currentYear && !termsError && (terms?.length ?? 0) > 0, path: "/academic-years" },
    { label: "Add a grade", done: (grades?.length ?? 0) > 0, path: "/classes" },
    { label: "Add a subject", done: (subjects?.length ?? 0) > 0, path: "/subjects" },
    { label: "Add a teacher", done: teacherCount > 0, path: "/teachers" },
    { label: "Add a class", done: (classes?.length ?? 0) > 0, path: "/classes" },
    { label: "Add a student", done: studentCount > 0, path: "/students" },
  ];

  return (
    <div className="os-page">
      <header className="os-dash-hero">
        <div>
          <h1 className="os-dash-hero__title">{title}</h1>
          <p className="os-dash-hero__sub">A quick view of what is happening across your school today.</p>
        </div>
        <div className="os-dash-hero__aside">
          {currentYear && <span className="os-dash-year"><CalendarOutlined />Academic year <strong>{currentYear.label}</strong></span>}
          {school?.logo_url && <img src={school.logo_url} alt={school.name ?? "School logo"} className="os-dash-hero__logo" />}
        </div>
      </header>

      <div className="os-dash-actions" aria-label="Quick actions">
        <LinkButton to="/students/new" size="large" type="primary" icon={<PlusOutlined />}>Add student</LinkButton>
        <LinkButton to="/classes/new" size="large" icon={<BankOutlined />}>Create class</LinkButton>
        <LinkButton to="/attendance" size="large" icon={<CalendarOutlined />}>Take attendance</LinkButton>
        <LinkButton to="/analytics" size="large" type="link" icon={<ArrowRightOutlined />} iconPlacement="end" className="os-dash-actions__end">View analytics</LinkButton>
      </div>

      {!setupLoading && <SetupChecklistCard items={setupItems} />}

      <div className="os-stat-grid">
        <StatCard label="Total students" value={studentCount} loading={studentsLoading} Icon={UserMultiple} path="/students" />
        <StatCard label="Teachers" value={teacherCount} loading={teachersLoading} Icon={Education} path="/teachers" />
        <StatCard label="Classes" value={classes?.length ?? 0} loading={classesLoading} Icon={Building} path="/classes" />
        <StatCard label="Subjects" value={subjects?.length ?? 0} loading={subjectsLoading} Icon={Book} path="/subjects" />
      </div>

      <div className="os-dash-lower">
        <AttendanceByClassSection
          classes={classes}
          loading={classAttendanceLoading}
          sessionByClassId={sessionByClassId}
        />

        <DashboardSnapshotSection
          teachers={staffAttendance?.teachers}
          nonAcademicStaff={staffAttendance?.non_academic_staff}
          staffLoading={staffAttendanceLoading}
        />
      </div>

      <RecentActivitySection items={recentActivity} loading={analyticsLoading} />
    </div>
  );
}
