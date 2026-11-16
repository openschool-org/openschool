import { Tag } from "antd";
import { BellOutlined, FileDoneOutlined, ScheduleOutlined, TableOutlined } from "@ant-design/icons";
import { useMemo } from "react";
import { useMyStudentProfile, useMyAttendance, useMyMarks } from "@/features/students/queries/useStudentSelf";
import { useMyClassTimetable } from "@/features/timetable/queries/useTimetables";
import { useUnreadNotificationCount } from "@/features/notifications/queries/useNotifications";
import { useCurrentTerm } from "@/features/school/queries/useTerms";
import StatCard from "@/features/reports/components/dashboard/StatCard";
import LoadingSpinner from "@/shared/ui/LoadingSpinner";
import ErrorMessage from "@/shared/ui/ErrorMessage";
import DashboardHero from "@/shared/ui/DashboardHero";
import { todayISODate } from "@/shared/lib/date";
import { formatPercent } from "@/shared/lib/number";
import { isNotFoundError } from "@/shared/api/errors";
import { useT } from "@/shared/i18n/useT";

export default function StudentDashboard() {
  const { t } = useT();
  const { data: profile, isLoading, isError, refetch } = useMyStudentProfile();
  const attendance = useMyAttendance();
  const term = useCurrentTerm();
  const marks = useMyMarks(term.data?.id ?? "");
  const timetable = useMyClassTimetable();
  const unread = useUnreadNotificationCount();

  const attendanceThisMonth = useMemo(() => {
    const month = todayISODate().slice(0, 7);
    const rows = (attendance.data ?? []).filter((r) => r.session_date.startsWith(month));
    if (rows.length === 0) return null;
    const present = rows.filter((r) => r.status === "present" || r.status === "late").length;
    return Math.round((present / rows.length) * 100);
  }, [attendance.data]);

  const termAverage = useMemo(() => {
    const graded = (marks.data ?? []).filter((m) => !m.is_absent && m.max_marks > 0);
    if (graded.length === 0) return null;
    const pct = graded.reduce((sum, m) => sum + m.marks / m.max_marks, 0) / graded.length;
    return Math.round(pct * 100);
  }, [marks.data]);

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

  // No current term is a normal state between terms, not a load failure.
  const noTerm = !term.isLoading && !term.data;
  const firstSubject = todayClasses[0]?.subject_name;

  return (
    <div className="os-page">
      <DashboardHero
        title={profile.full_name}
        subtitle={[profile.index_number, profile.grade_name, profile.class_name].filter(Boolean).join(" · ")}
        aside={profile.house_name && <Tag color="blue" variant="filled">{t("student.houseTag", { house: profile.house_name })}</Tag>}
      />

      <div className="os-stat-grid">
        <StatCard
          label={t("student.attendanceThisMonth")}
          value={formatPercent(attendanceThisMonth)}
          loading={attendance.isLoading}
          error={attendance.isError}
          Icon={ScheduleOutlined}
          path="/s/attendance"
        />
        <StatCard
          label={t("student.latestMarks")}
          value={noTerm ? "-" : formatPercent(termAverage)}
          meta={noTerm ? t("student.noTerm") : term.data?.name}
          loading={term.isLoading || marks.isLoading}
          error={marks.isError}
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
    </div>
  );
}
