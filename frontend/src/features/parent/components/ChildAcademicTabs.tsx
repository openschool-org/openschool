import { useMemo } from "react";
import { useChildAttendance, useChildMarkHistory } from "@/features/parent/queries/useParent";
import { useCurrentAcademicYear } from "@/features/school/queries/useAcademicYears";
import { useChildTimetable } from "@/features/timetable/queries/useTimetables";
import { useStudentEnrollments } from "@/features/students/queries/useEnrollments";
import { useProgressReports } from "@/features/portfolio/queries/useStudentPortfolio";
import { useGuardiansByStudent } from "@/features/guardians/queries/useGuardians";
import WeeklyTimetable from "@/features/timetable/components/WeeklyTimetable";
import AttendanceOverview from "@/features/attendance/components/AttendanceOverview";
import MarkHistory from "@/features/marks/components/MarkHistory";
import PortfolioByYear from "@/features/portfolio/components/PortfolioByYear";
import ErrorMessage from "@/shared/ui/ErrorMessage";
import EnrollmentsTable from "@/features/students/components/EnrollmentsTable";
import ProgressReportsTable from "@/features/portfolio/components/ProgressReportsTable";
import GuardiansTable from "@/features/guardians/components/GuardiansTable";
import LoadingSpinner from "@/shared/ui/LoadingSpinner";
import EmptyState from "@/shared/ui/EmptyState";
import { useT } from "@/shared/i18n/useT";

type Props = { studentId: string };

export function ChildTimetableTab({ studentId }: Props) {
  const { t } = useT();
  const { data, isLoading, isError } = useChildTimetable(studentId);
  if (isLoading) return <LoadingSpinner />;
  if (!data) return <EmptyState title={t("timetable.emptyTitle")} description={t("timetable.emptyChild")} />;

  return (
    <div className="os-grid os-gap-4">
      {isError && <p className="os-m-0 os-text-sm os-c-secondary">{t("timetable.savedCopy")}</p>}
      <WeeklyTimetable entries={data.entries} periods={data.periods} detail={(e) => e.teacher_name ?? ""} />
    </div>
  );
}

export function ChildAttendanceTab({ studentId }: Props) {
  const { t } = useT();
  const { data: records, isLoading } = useChildAttendance(studentId);
  if (isLoading) return <LoadingSpinner />;
  if (!records?.length) return <EmptyState title={t("attendance.emptyTitle")} description={t("attendance.emptyDesc")} />;
  return <AttendanceOverview records={records} />;
}

export function ChildMarksTab({ studentId }: Props) {
  const { t } = useT();
  const { data: years, isLoading, isError, refetch } = useChildMarkHistory(studentId);
  if (isLoading) return <LoadingSpinner />;
  if (isError) return <ErrorMessage message={t("common.loadFailed")} onRetry={refetch} />;
  return <MarkHistory years={years ?? []} />;
}

export function ChildEnrollmentsTab({ studentId }: Props) {
  const { t } = useT();
  const { data: currentYear } = useCurrentAcademicYear();
  const { data: enrollments, isLoading } = useStudentEnrollments(studentId, currentYear?.id ?? "");
  if (isLoading) return <LoadingSpinner />;
  if (!enrollments?.length) return <EmptyState title={t("enrol.emptyTitle")} description={t("enrol.emptyChild")} />;
  return <EnrollmentsTable rows={enrollments} />;
}

export function ChildProgressReportsTab({ studentId }: Props) {
  const { t } = useT();
  const { data: reports, isLoading } = useProgressReports(studentId);
  if (isLoading) return <LoadingSpinner />;
  if (!reports?.length) return <EmptyState title={t("progress.emptyTitle")} description={t("progress.emptyChild")} />;
  return <ProgressReportsTable rows={reports} />;
}

export function ChildGuardiansTab({ studentId }: Props) {
  const { t } = useT();
  const { data: guardians, isLoading } = useGuardiansByStudent(studentId);
  if (isLoading) return <LoadingSpinner />;
  if (!guardians?.length) return <EmptyState title={t("guardians.emptyChildTitle")} description={t("guardians.emptyChild")} />;
  return <GuardiansTable rows={guardians} />;
}

export function ChildPortfolioTab({ studentId }: Props) {
  // Parents cannot list academic years, so year names come from the child's class history.
  const { data: history } = useChildMarkHistory(studentId);
  const yearLabels = useMemo(() => Object.fromEntries((history ?? []).map((y) => [y.academic_year_id, y.academic_year])), [history]);
  return <PortfolioByYear studentId={studentId} yearLabels={yearLabels} />;
}
