import { useQueries } from "@tanstack/react-query";
import { useMyClasses } from "../../../queries/useTeachers";
import { useDailySessions, classSessionsKey } from "../../../queries/useAttendance";
import { classStudentsKey } from "../../../queries/useClasses";
import { useCurrentAcademicYear } from "../../../queries/useAcademicYears";
import { useTerms } from "../../../queries/useTerms";
import { useMyPosition } from "../../../queries/usePositions";
import { attendanceApi } from "../../../services/attendance";
import { studentApi } from "../../../services/student";
import LoadingSpinner from "../../../components/common/LoadingSpinner";
import ErrorMessage from "../../../components/common/ErrorMessage";
import WelcomeBanner from "./WelcomeBanner";
import TodaysClasses from "./TodaysClasses";
import RecentSessions from "./RecentSessions";
import QuickActions from "./QuickActions";
import TodaySummary from "./TodaySummary";
import MyClassesPanel from "./MyClassesPanel";
import LeadershipPanel from "./LeadershipPanel";
import { todayISODate } from "../../../lib/date";

// Section Head and above carry multi-grade/school-wide responsibility, so
// they get the extra Leadership panel; a plain Class/Subject Teacher's
// dashboard stays focused on their own classes.
const LEADERSHIP_RANK_CUTOFF = 3; // RankSectionHead, matches backend's PositionRank ordinal

export default function TeacherDashboard() {
  const { teacher: profile, classes: myClasses, isLoading: profileLoading, isError: profileError, refetch } = useMyClasses();
  const { data: currentYear } = useCurrentAcademicYear();
  const { data: terms } = useTerms(currentYear?.id);
  const { data: dailySessions } = useDailySessions(todayISODate());
  const { data: positionSummary } = useMyPosition();

  const classIds = myClasses.map((c) => c.class_id);

  const studentQueries = useQueries({
    queries: classIds.map((id) => ({
      queryKey: classStudentsKey(id),
      queryFn: () => studentApi.listByClass(id),
      enabled: !!id,
    })),
  });
  const sessionQueries = useQueries({
    queries: classIds.map((id) => ({
      queryKey: classSessionsKey(id),
      queryFn: () => attendanceApi.listSessionsByClass(id),
      enabled: !!id,
    })),
  });

  const studentCountByClass = new Map(classIds.map((id, i) => [id, studentQueries[i]?.data?.length ?? 0]));
  const totalStudents = [...studentCountByClass.values()].reduce((sum, n) => sum + n, 0);

  const todaySessionByClass = new Map(
    (dailySessions ?? []).filter((s) => classIds.includes(s.class_id)).map((s) => [s.class_id, s]),
  );
  const markedCount = [...todaySessionByClass.values()].filter((s) => s.marked_count > 0).length;
  const pendingCount = Math.max(myClasses.length - markedCount, 0);

  const recentSessions = classIds
    .flatMap((id, i) => {
      const cls = myClasses.find((c) => c.class_id === id);
      return (sessionQueries[i]?.data ?? []).map((s) => ({ session: s, className: cls?.class_name ?? "" }));
    })
    .sort((a, b) => b.session.date.localeCompare(a.session.date))
    .slice(0, 6);

  const currentTerm = terms?.find((t) => t.is_current);

  if (profileLoading) return <LoadingSpinner />;
  if (profileError || !profile) {
    return (
      <div style={{ padding: "2rem" }}>
        <ErrorMessage message="Failed to load your teacher profile" onRetry={refetch} />
      </div>
    );
  }

  const subjectSummary = [...new Set(myClasses.flatMap((c) => c.subjects))].join(", ") || "No subjects assigned yet";
  const rankLabel = positionSummary?.rank_label ?? "Teacher";
  const showLeadershipPanel = !!positionSummary && positionSummary.rank <= LEADERSHIP_RANK_CUTOFF;

  return (
    <div className="os-page">
      <WelcomeBanner
        profile={profile}
        subjectSummary={subjectSummary}
        currentYearLabel={currentYear?.label}
        currentTermName={currentTerm?.name}
        pendingCount={pendingCount}
        rankLabel={rankLabel}
      />

      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "1.5rem", alignItems: "start" }}>
        <div>
          <TodaysClasses
            loading={profileLoading}
            myClasses={myClasses}
            studentCountByClass={studentCountByClass}
            todaySessionByClass={todaySessionByClass}
          />
          <RecentSessions sessions={recentSessions} />
        </div>

        <div>
          {showLeadershipPanel && positionSummary && <LeadershipPanel summary={positionSummary} />}
          <QuickActions rankLabel={rankLabel} notifyWholeSchool={positionSummary?.notify_whole_school ?? false} />
          <TodaySummary
            markedCount={markedCount}
            pendingCount={pendingCount}
            myClassCount={myClasses.length}
            totalStudents={totalStudents}
          />
          <MyClassesPanel
            myClasses={myClasses}
            studentCountByClass={studentCountByClass}
            todaySessionByClass={todaySessionByClass}
          />
        </div>
      </div>
    </div>
  );
}
