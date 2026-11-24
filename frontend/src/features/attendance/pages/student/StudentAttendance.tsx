import { useMyAttendance } from "@/features/students/queries/useStudentSelf";
import AttendanceOverview from "@/features/attendance/components/AttendanceOverview";
import LoadingSpinner from "@/shared/ui/LoadingSpinner";
import ErrorMessage from "@/shared/ui/ErrorMessage";
import { useT } from "@/shared/i18n/useT";

export default function StudentAttendance() {
  const { t } = useT();
  const { data: records, isLoading, isError, refetch } = useMyAttendance();
  if (isLoading) return <LoadingSpinner />;
  if (isError) {
    return (
      <div className="os-p-8">
        <ErrorMessage message={t("common.loadFailed")} onRetry={refetch} />
      </div>
    );
  }
  return (
    <div className="os-p-8">
      <AttendanceOverview records={records ?? []} />
    </div>
  );
}
