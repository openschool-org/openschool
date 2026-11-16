import { useQueries } from "@tanstack/react-query";
import { ArrowRightOutlined, BankOutlined, BellOutlined, CalendarOutlined, CheckCircleOutlined, ClockCircleOutlined, FileDoneOutlined, ScheduleOutlined, TeamOutlined } from "@ant-design/icons";
import { POSITION_RANK } from "@/shared/lib/constants/people";
import { useMyClasses, useTeacherSubjects } from "@/features/teachers/queries/useTeachers";
import { classSessionsOptions } from "@/features/attendance/queries/useAttendance";
import { useCurrentAcademicYear } from "@/features/school/queries/useAcademicYears";
import { useTerms } from "@/features/school/queries/useTerms";
import { useMyPosition } from "@/features/positions/queries/usePositions";
import LoadingSpinner from "@/shared/ui/LoadingSpinner";
import ErrorMessage from "@/shared/ui/ErrorMessage";
import EmptyState from "@/shared/ui/EmptyState";
import DashboardHero from "@/shared/ui/DashboardHero";
import LinkButton from "@/shared/ui/LinkButton";
import StatCard from "@/features/reports/components/dashboard/StatCard";
import RoleBadge from "@/features/teachers/components/dashboard/RoleBadge";
import TodaysClasses from "@/features/teachers/components/dashboard/TodaysClasses";
import RecentSessions from "@/features/teachers/components/dashboard/RecentSessions";
import LeadershipPanel from "@/features/teachers/components/dashboard/LeadershipPanel";
import LeadershipOverviewPanel from "@/features/teachers/components/dashboard/LeadershipOverviewPanel";
import TimetableReviewPanel from "@/features/teachers/components/dashboard/TimetableReviewPanel";
import { todayISODate } from "@/shared/lib/date";
import { classLabel } from "@/shared/lib/classLabel";
import { displayName } from "@/shared/lib/name";

function greeting(): string {
  const hour = new Date().getHours();
  return hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
}

export default function TeacherDashboard() {
  const { teacher: profile, classes: myClasses, isLoading: profileLoading, isError: profileError, refetch } = useMyClasses();
  const { data: qualified } = useTeacherSubjects(profile?.id ?? "");
  const { data: currentYear } = useCurrentAcademicYear();
  const { data: terms } = useTerms(currentYear?.id);
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
  const markedCount = todaySessionByClass.size;
  const pendingCount = Math.max(myClasses.length - markedCount, 0);
  const totalStudents = myClasses.reduce((sum, c) => sum + c.studentCount, 0);

  const recentSessions = myClasses
    .flatMap((c, i) => (sessionQueries[i]?.data ?? []).map((s) => ({ session: s, className: classLabel(c.grade_name, c.class_name) })))
    .sort((a, b) => b.session.date.localeCompare(a.session.date))
    .slice(0, 6);

  if (profileLoading) return <LoadingSpinner />;
  if (profileError || !profile) {
    return (
      <div className="os-p-8">
        <ErrorMessage message="Failed to load your teacher profile" onRetry={refetch} />
      </div>
    );
  }

  // Subjects assigned in classes, else the teacher's qualifications until an admin assigns classes.
  const classSubjects = [...new Set(myClasses.flatMap((c) => c.subjects))];
  const subjectSummary = (classSubjects.length > 0 ? classSubjects : (qualified ?? []).map((q) => q.name)).join(", ") || "No subjects yet";
  const currentTerm = terms?.find((t) => t.is_current);
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
      <RecentSessions sessions={recentSessions} />
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
            {currentYear && (
              <span className="os-dash-year">
                <CalendarOutlined />Academic year <strong>{currentYear.label}</strong>{currentTerm ? ` · ${currentTerm.name}` : ""}
              </span>
            )}
          </>
        }
      />

      <div className="os-dash-actions" aria-label="Quick actions">
        <LinkButton to="/t/attendance" size="large" type="primary" icon={<ScheduleOutlined />}>Take attendance</LinkButton>
        <LinkButton to="/t/marks" size="large" icon={<FileDoneOutlined />}>Enter marks</LinkButton>
        <LinkButton to="/t/notifications" size="large" icon={<BellOutlined />}>Send notification</LinkButton>
        <LinkButton to="/t/timetable" size="large" type="link" icon={<ArrowRightOutlined />} iconPlacement="end" className="os-dash-actions__end">My timetable</LinkButton>
      </div>

      {isLeader && <LeadershipOverviewPanel />}

      {hasClasses && (
        <>
          {isLeader && <p className="os-dash-section-label">Your classes</p>}
          <div className="os-stat-grid">
            <StatCard label="My classes" value={myClasses.length} loading={false} Icon={BankOutlined} path="/t/classes" />
            <StatCard label="Students" value={totalStudents} loading={false} Icon={TeamOutlined} path="/t/classes" />
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
