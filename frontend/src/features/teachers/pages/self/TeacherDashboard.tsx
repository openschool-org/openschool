import { useQueries } from "@tanstack/react-query";
import { BankOutlined, BellOutlined, CheckCircleOutlined, ClockCircleOutlined, FileDoneOutlined, ScheduleOutlined, TableOutlined, TeamOutlined } from "@ant-design/icons";
import { POSITION_RANK } from "@/shared/lib/constants/people";
import { useMyClasses, useTeacherSubjects } from "@/features/teachers/queries/useTeachers";
import { classSessionsOptions } from "@/features/attendance/queries/useAttendance";
import { useCurrentAcademicYear } from "@/features/school/queries/useAcademicYears";
import { useYearTermItems } from "@/features/school/hooks/useYearTermItems";
import ContextStrip from "@/shared/ui/ContextStrip";
import { useMyPosition } from "@/features/positions/queries/usePositions";
import LoadingSpinner from "@/shared/ui/LoadingSpinner";
import ErrorMessage from "@/shared/ui/ErrorMessage";
import EmptyState from "@/shared/ui/EmptyState";
import DashboardHero from "@/shared/ui/DashboardHero";
import SchoolLogo from "@/features/school/components/SchoolLogo";
import LinkButton from "@/shared/ui/LinkButton";
import StatCard from "@/features/reports/components/dashboard/StatCard";
import RoleBadge from "@/features/teachers/components/dashboard/RoleBadge";
import TodaysClasses from "@/features/teachers/components/dashboard/TodaysClasses";
import LeadershipPanel from "@/features/teachers/components/dashboard/LeadershipPanel";
import LeadershipOverviewPanel from "@/features/teachers/components/dashboard/LeadershipOverviewPanel";
import TimetableReviewPanel from "@/features/teachers/components/dashboard/TimetableReviewPanel";
import { todayISODate } from "@/shared/lib/date";
import { displayName } from "@/shared/lib/name";

function greeting(): string {
  const hour = new Date().getHours();
  return hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
}

export default function TeacherDashboard() {
  const { teacher: profile, classes: myClasses, isLoading: profileLoading, isError: profileError, refetch } = useMyClasses();
  const { data: qualified } = useTeacherSubjects(profile?.id ?? "");
  const { data: currentYear } = useCurrentAcademicYear();
  const yearTerm = useYearTermItems();
  const { data: position } = useMyPosition();
  const isLeader = !!position && position.rank <= POSITION_RANK.sectionHead;
  const isSectionHead = position?.rank === POSITION_RANK.sectionHead;

  const sessionQueries = useQueries({ queries: myClasses.map((c) => classSessionsOptions(c.class_id)) });
  const sessionsLoading = sessionQueries.some((q) => q.isLoading);
  const sessionsError = sessionQueries.some((q) => q.isError);
  const retrySessions = () => sessionQueries.forEach((q) => q.isError && q.refetch());

  // From each class's own sessions: the date-wide list is leadership-only and is empty for most teachers.
  const today = todayISODate();
  const todaySessionByClass = new Map(
    myClasses.flatMap((c, i) => (sessionQueries[i]?.data ?? []).filter((s) => s.date === today).map((s) => [c.class_id, s] as const)),
  );
  // Attendance is the class teacher's job, so today's counts cover only the classes this teacher leads.
  const formClasses = myClasses.filter((c) => c.isFormTeacher);
  const markedCount = formClasses.filter((c) => todaySessionByClass.has(c.class_id)).length;
  const pendingCount = formClasses.length - markedCount;
  const totalStudents = myClasses.reduce((sum, c) => sum + c.studentCount, 0);

  if (profileLoading) return <LoadingSpinner />;
  if (profileError || !profile) {
    return (
      <div className="os-page">
        <ErrorMessage message="Failed to load your teacher profile" onRetry={refetch} />
      </div>
    );
  }

  // Subjects assigned in classes, else the teacher's qualifications until an admin assigns classes.
  const classSubjects = [...new Set(myClasses.flatMap((c) => c.subjects))];
  const subjectSummary = (classSubjects.length > 0 ? classSubjects : (qualified ?? []).map((q) => q.name)).join(", ") || "No subjects yet";
  const formClass = myClasses.find((c) => c.isFormTeacher)?.class_name;
  const hasClasses = myClasses.length > 0;
  const sessionCard = { loading: sessionsLoading, error: sessionsError };

  const aside = (
    <>
      {isLeader && position && <LeadershipPanel summary={position} />}
      {isSectionHead && currentYear && <TimetableReviewPanel academicYearId={currentYear.id} />}
    </>
  );

  const classesColumn = hasClasses ? (
    <div>
      <TodaysClasses myClasses={myClasses} todaySessionByClass={todaySessionByClass} loading={sessionsLoading} error={sessionsError} onRetry={retrySessions} />
    </div>
  ) : !isLeader ? (
    <EmptyState title="No classes assigned yet" description="Ask the office to add you as a class or subject teacher." />
  ) : null;

  return (
    <div className="os-page">
      <DashboardHero
        title={`${greeting()}, ${profile.title ? `${profile.title} ` : ""}${displayName(profile)}`}
        subtitle={`${subjectSummary} · ${profile.employee_number}`}
        aside={
          <>
            <RoleBadge rankLabel={position?.rank_label ?? "Teacher"} />
            <SchoolLogo />
          </>
        }
      />
      <ContextStrip
        label="School year"
        items={[
          ...yearTerm,
          { key: "classes", label: "My classes", value: myClasses.length, meta: formClass ? `Class teacher of ${formClass}` : "Subject teacher" },
          { key: "role", label: "Role", value: position?.rank_label ?? "Teacher", meta: profile.employee_number },
        ]}
      />
      <div className="os-page__actions os-mb-6" aria-label="Quick actions">
        <LinkButton to="/t/attendance" type="primary" icon={<ScheduleOutlined />}>{formClasses.length ? "Take attendance" : "Class attendance"}</LinkButton>
        <LinkButton to="/t/marks" icon={<FileDoneOutlined />}>Enter marks</LinkButton>
        <LinkButton to="/t/notifications" icon={<BellOutlined />}>Send notification</LinkButton>
        <LinkButton to="/t/timetable" icon={<TableOutlined />}>My timetable</LinkButton>
      </div>

      {isLeader && <LeadershipOverviewPanel />}

      {hasClasses && (
        <>
          {isLeader && <p className="os-dash-section-label">Your classes</p>}
          <div className="os-stat-grid">
            <StatCard label="My classes" value={myClasses.length} loading={false} Icon={BankOutlined} path={formClasses.length ? "/t/classes" : "/t/attendance"} />
            <StatCard label="Students" value={totalStudents} loading={false} Icon={TeamOutlined} path={formClasses.length ? "/t/classes" : "/t/attendance"} />
            <StatCard {...sessionCard} label="Marked today" value={markedCount} Icon={CheckCircleOutlined} path="/t/attendance" />
            <StatCard {...sessionCard} label="Not marked yet" value={pendingCount} Icon={ClockCircleOutlined} path="/t/attendance" />
          </div>
        </>
      )}

      {hasClasses && isLeader ? (
        <div className="os-dash-lower">
          {classesColumn}
          <div>{aside}</div>
        </div>
      ) : (
        <>
          {classesColumn}
          {isLeader && aside}
        </>
      )}
    </div>
  );
}
