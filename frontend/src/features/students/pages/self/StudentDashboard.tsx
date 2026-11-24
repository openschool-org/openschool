import { Tag } from "antd";
import { BellOutlined, CrownOutlined, FileDoneOutlined, ScheduleOutlined, TableOutlined } from "@ant-design/icons";
import { useMemo } from "react";
import { useMyStudentProfile, useMyAttendance, useMyMarkHistory } from "@/features/students/queries/useStudentSelf";
import { useMyClassTimetable } from "@/features/timetable/queries/useTimetables";
import { useUnreadNotificationCount } from "@/features/notifications/queries/useNotifications";
import { useCurrentAcademicYear } from "@/features/school/queries/useAcademicYears";
import { usePrefectAppointmentsByStudent } from "@/features/portfolio/queries/useStudentPortfolio";
import { averagePercent } from "@/features/marks/lib/grade";
import StatCard from "@/features/reports/components/dashboard/StatCard";
import StudentContextStrip from "@/features/students/components/dashboard/StudentContextStrip";
import LatestResultsPanel from "@/features/students/components/dashboard/LatestResultsPanel";
import RecentAttendancePanel from "@/features/students/components/dashboard/RecentAttendancePanel";
import RolesPanel from "@/features/students/components/dashboard/RolesPanel";
import LoadingSpinner from "@/shared/ui/LoadingSpinner";
import ErrorMessage from "@/shared/ui/ErrorMessage";
import DashboardHero from "@/shared/ui/DashboardHero";
import SchoolLogo from "@/features/school/components/SchoolLogo";
import { todayISODate } from "@/shared/lib/date";
import { formatPercent } from "@/shared/lib/number";
import { isNotFoundError } from "@/shared/api/errors";
import { useT } from "@/shared/i18n/useT";
import { translateValue } from "@/shared/i18n/translateValue";

export default function StudentDashboard() {
  const { t } = useT();
  const { data: profile, isLoading, isError, refetch } = useMyStudentProfile();
  const attendance = useMyAttendance();
  const history = useMyMarkHistory();
  const timetable = useMyClassTimetable();
  const unread = useUnreadNotificationCount();
  const year = useCurrentAcademicYear();
  const prefects = usePrefectAppointmentsByStudent(profile?.id ?? "");

  const month = useMemo(() => {
    const thisMonth = todayISODate().slice(0, 7);
    const rows = (attendance.data ?? []).filter((r) => r.session_date.startsWith(thisMonth));
    const attended = rows.filter((r) => r.status === "present" || r.status === "late").length;
    return { days: rows.length, attended, rate: rows.length ? Math.round((attended / rows.length) * 100) : null };
  }, [attendance.data]);

  const { currentTerm, latestTerm } = useMemo(() => {
    const years = history.data ?? [];
    const current = years.find((y) => y.is_current)?.terms.find((term) => term.is_current) ?? null;
    // Newest year first from the API; within a year the last term with marks is the latest.
    const latest = years.flatMap((y) => [...y.terms].reverse()).find((term) => term.marks.length > 0) ?? null;
    return { currentTerm: current, latestTerm: latest };
  }, [history.data]);
  const termAverage = currentTerm ? averagePercent(currentTerm.marks) : null;

  // Timetable days run 1 (Mon) to 5 (Fri), the same as Date.getDay().
  const todayClasses = useMemo(
    () => (timetable.data?.entries ?? []).filter((e) => e.day_of_week === new Date().getDay()).sort((a, b) => a.period_number - b.period_number),
    [timetable.data],
  );

  if (isLoading) return <LoadingSpinner />;
  if (isError || !profile) {
    return (
      <div className="os-p-8">
        <ErrorMessage message={t("student.loadProfileFailed")} onRetry={refetch} />
      </div>
    );
  }

  const firstSubject = todayClasses[0]?.subject_name;
  const prefect = (prefects.data ?? []).find((p) => p.academic_year_id === year.data?.id);

  return (
    <div className="os-page">
      <DashboardHero
        title={profile.full_name}
        subtitle={[profile.index_number, profile.grade_name, profile.class_name].filter(Boolean).join(" · ")}
        aside={
          <>
            {prefect && (
              <Tag color="gold" variant="solid" icon={<CrownOutlined />}>
                {t("student.prefectYear", { rank: translateValue(t, "prefect", prefect.rank), year: prefect.academic_year_label })}
              </Tag>
            )}
            {profile.house_name && <Tag color="blue" variant="filled">{t("student.houseTag", { house: profile.house_name })}</Tag>}
            <SchoolLogo />
          </>
        }
      />

      <StudentContextStrip profile={profile} />

      <div className="os-stat-grid os-stat-grid--compact">
        <StatCard
          label={t("student.attendanceThisMonth")}
          value={formatPercent(month.rate)}
          meta={month.days ? t("student.daysAttended", { attended: month.attended, days: month.days }) : undefined}
          loading={attendance.isLoading}
          error={attendance.isError}
          Icon={ScheduleOutlined}
          path="/s/attendance"
        />
        <StatCard
          label={t("student.latestMarks")}
          value={formatPercent(termAverage)}
          meta={currentTerm ? t("student.subjectsMarked", { term: currentTerm.name, count: currentTerm.marks.length }) : t("student.noTerm")}
          loading={history.isLoading}
          error={history.isError}
          Icon={FileDoneOutlined}
          path="/s/marks"
        />
        <StatCard
          label={t("student.todaysClasses")}
          value={todayClasses.length}
          meta={firstSubject ? t("student.firstPeriod", { subject: firstSubject }) : undefined}
          loading={timetable.isLoading}
          error={timetable.isError && !isNotFoundError(timetable.error)}
          Icon={TableOutlined}
          path="/s/timetable"
        />
        <StatCard
          label={t("student.unreadNotices")}
          value={unread.data ?? 0}
          loading={unread.isLoading}
          error={unread.isError}
          Icon={BellOutlined}
          path="/notification-center"
        />
      </div>

      <div className="os-dash-panels">
        <LatestResultsPanel term={latestTerm} />
        <RecentAttendancePanel records={attendance.data ?? []} />
        <RolesPanel studentId={profile.id} yearId={year.data?.id} />
      </div>
    </div>
  );
}
