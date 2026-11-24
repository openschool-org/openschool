import { useMyAttendance } from "@/features/students/queries/useStudentSelf";
import AttendanceOverview from "@/features/attendance/components/AttendanceOverview";
import LoadingSpinner from "@/shared/ui/LoadingSpinner";
import ErrorMessage from "@/shared/ui/ErrorMessage";
import PageHeader from "@/shared/ui/PageHeader";
import { useT } from "@/shared/i18n/useT";

export default function StudentAttendance() {
  const { t } = useT();
  const { data: records, isLoading, isError, refetch } = useMyAttendance();
  return (
    <div className="os-page">
      <PageHeader title={t("nav.attendance")} subtitle={t("page.attendance.sub")} />
      {isLoading ? (
        <LoadingSpinner />
      ) : isError ? (
        <ErrorMessage message={t("common.loadFailed")} onRetry={refetch} />
      ) : (
        <AttendanceOverview records={records ?? []} />
      )}
    </div>
  );
}
