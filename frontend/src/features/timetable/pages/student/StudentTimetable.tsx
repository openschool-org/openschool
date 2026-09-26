import { useMyClassTimetable } from "@/features/timetable/queries/useTimetables";
import TimetableByDay from "@/features/timetable/components/TimetableByDay";
import LoadingSpinner from "@/shared/ui/LoadingSpinner";
import EmptyState from "@/shared/ui/EmptyState";
import SectionCard from "@/shared/ui/SectionCard";
import { useT } from "@/shared/i18n/useT";

export default function StudentTimetable() {
  const { t } = useT();
  const { data, isLoading, isError } = useMyClassTimetable();
  if (isLoading) return <LoadingSpinner />;
  return (
    <div className="os-p-8">
      <SectionCard title={t("timetable.classTimetable")}>
        {!data ? (
          <EmptyState title={t("timetable.emptyTitle")} description={t("timetable.emptyStudent")} />
        ) : (
          <div className="os-grid os-gap-6">
            {isError && <p className="os-m-0 os-text-sm os-c-secondary">{t("timetable.savedCopy")}</p>}
            <TimetableByDay entries={data.entries} getRowId={(e) => e.id} middle={{ key: "teacher", header: t("table.teacher"), render: (e) => e.teacher_name ?? "-" }} />
          </div>
        )}
      </SectionCard>
    </div>
  );
}
