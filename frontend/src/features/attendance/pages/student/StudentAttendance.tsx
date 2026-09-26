import { useMyAttendance } from "@/features/students/queries/useStudentSelf";
import AttendanceHistoryTable from "@/features/attendance/components/AttendanceHistoryTable";
import LoadingSpinner from "@/shared/ui/LoadingSpinner";
import EmptyState from "@/shared/ui/EmptyState";
import SectionCard from "@/shared/ui/SectionCard";
import { useT } from "@/shared/i18n/useT";

export default function StudentAttendance() {
  const { t } = useT();
  const { data: records, isLoading } = useMyAttendance();
  if (isLoading) return <LoadingSpinner />;
  return (
    <div className="os-p-8">
      <SectionCard title={t("attendance.history")} flush>
        {records?.length ? (
          <AttendanceHistoryTable rows={records} />
        ) : (
          <EmptyState title={t("attendance.emptyTitle")} description={t("attendance.emptyDesc")} />
        )}
      </SectionCard>
    </div>
  );
}
