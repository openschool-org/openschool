import { POSITION_RANK } from "@/shared/lib/constants/people";
import { useQueries } from "@tanstack/react-query";
import { useMyClasses, useTeacherSubjects } from "@/features/teachers/queries/useTeachers";
import { classSessionsOptions } from "@/features/attendance/queries/useAttendance";
import { useCurrentAcademicYear } from "@/features/school/queries/useAcademicYears";
import { useTerms } from "@/features/school/queries/useTerms";
import { useMyPosition, useMyLeadershipOverview } from "@/features/positions/queries/usePositions";
import LoadingSpinner from "@/shared/ui/LoadingSpinner";
import ErrorMessage from "@/shared/ui/ErrorMessage";
import WelcomeBanner from "@/features/teachers/components/dashboard/WelcomeBanner";
import TodaysClasses from "@/features/teachers/components/dashboard/TodaysClasses";
import RecentSessions from "@/features/teachers/components/dashboard/RecentSessions";
import QuickActions from "@/features/teachers/components/dashboard/QuickActions";
import StatCard from "@/features/reports/components/dashboard/StatCard";
import LeadershipPanel from "@/features/teachers/components/dashboard/LeadershipPanel";
import LeadershipOverviewPanel from "@/features/teachers/components/dashboard/LeadershipOverviewPanel";
import TimetableReviewPanel from "@/features/teachers/components/dashboard/TimetableReviewPanel";
import { todayISODate } from "@/shared/lib/date";
import { classLabel } from "@/shared/lib/classLabel";
import { Building, UserMultiple, CheckmarkOutline, Time } from "@carbon/icons-react";

export default function TeacherDashboard() {
  const { teacher: profile, classes: myClasses, isLoading: profileLoading, isError: profileError, refetch } = useMyClasses();
  const { data: qualified } = useTeacherSubjects(profile?.id ?? "");
  const { data: currentYear } = useCurrentAcademicYear();
  const { data: terms } = useTerms(currentYear?.id);
  const { data: positionSummary } = useMyPosition();
  const showLeadershipPanel = !!positionSummary && positionSummary.rank <= POSITION_RANK.sectionHead;
  const { data: leadershipOverview } = useMyLeadershipOverview(showLeadershipPanel);
  const isSectionHead = positionSummary?.rank === POSITION_RANK.sectionHead;

  const classIds = myClasses.map((c) => c.class_id);

  const sessionQueries = useQueries({ queries: classIds.map(classSessionsOptions) });

  const studentCountByClass = new Map(myClasses.map((c) => [c.class_id, c.studentCount]));
  const totalStudents = [...studentCountByClass.values()].reduce((sum, n) => sum + n, 0);

  // From each class's own sessions: the date-wide list is leadership-only and is empty for most teachers.
  const today = todayISODate();
  const todaySessionByClass = new Map(
    classIds.flatMap((id, i) => (sessionQueries[i]?.data ?? []).filter((s) => s.date === today).map((s) => [id, s] as const)),
  );
  const markedCount = todaySessionByClass.size;
  const pendingCount = Math.max(myClasses.length - markedCount, 0);

  const recentSessions = classIds
    .flatMap((id, i) => {
      const cls = myClasses.find((c) => c.class_id === id);
      return (sessionQueries[i]?.data ?? []).map((s) => ({ session: s, className: cls ? classLabel(cls.grade_name, cls.class_name) : "" }));
    })
    .sort((a, b) => b.session.date.localeCompare(a.session.date))
    .slice(0, 6);

  const currentTerm = terms?.find((t) => t.is_current);

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
  const rankLabel = positionSummary?.rank_label ?? "Teacher";

  return (
    <div className="os-page">
      <WelcomeBanner
        profile={profile}
        subjectSummary={subjectSummary}
        currentYearLabel={currentYear?.label}
        currentTermName={currentTerm?.name}
        pendingCount={pendingCount}
        classCount={myClasses.length}
        rankLabel={rankLabel}
      />

      <div className="os-stat-grid">
        <StatCard label="My classes" value={myClasses.length} loading={false} Icon={Building} path="/t/classes" />
        <StatCard label="Students" value={totalStudents} loading={false} Icon={UserMultiple} path="/t/classes" />
        <StatCard label="Marked today" value={markedCount} loading={false} Icon={CheckmarkOutline} path="/t/attendance" />
        <StatCard label="Not marked yet" value={pendingCount} loading={false} Icon={Time} path="/t/attendance" />
      </div>

      <div className="os-grid os-grid-cols-2-1 os-gap-6 os-items-grid-start">
        <div>
          <TodaysClasses
            myClasses={myClasses}
            studentCountByClass={studentCountByClass}
            todaySessionByClass={todaySessionByClass}
            markedCount={markedCount}
          />
          <RecentSessions sessions={recentSessions} />
        </div>

        <div>
          {showLeadershipPanel && leadershipOverview && <LeadershipOverviewPanel overview={leadershipOverview} />}
          {showLeadershipPanel && positionSummary && <LeadershipPanel summary={positionSummary} />}
          {isSectionHead && currentYear && <TimetableReviewPanel academicYearId={currentYear.id} />}
          <QuickActions rankLabel={rankLabel} notifyWholeSchool={positionSummary?.notify_whole_school ?? false} />
        </div>
      </div>
    </div>
  );
}
