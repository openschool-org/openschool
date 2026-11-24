import { useMyClassTimetable } from "@/features/timetable/queries/useTimetables";
import WeeklyTimetable from "@/features/timetable/components/WeeklyTimetable";
import LoadingSpinner from "@/shared/ui/LoadingSpinner";
import EmptyState from "@/shared/ui/EmptyState";
import PageHeader from "@/shared/ui/PageHeader";
import SectionCard from "@/shared/ui/SectionCard";
import { useT } from "@/shared/i18n/useT";

export default function StudentTimetable() {
  const { t } = useT();
  const { data, isLoading, isError } = useMyClassTimetable();
  return (
    <div className="os-page">
      <PageHeader title={t("nav.timetable")} subtitle={t("page.timetable.sub")} />
      {isLoading ? (
        <LoadingSpinner />
      ) : (
        <SectionCard title={t("timetable.weekly")}>
          {!data ? (
            <EmptyState title={t("timetable.emptyTitle")} description={t("timetable.emptyStudent")} />
          ) : (
            <div className="os-grid os-gap-4">
              {isError && <p className="os-m-0 os-text-sm os-c-secondary">{t("timetable.savedCopy")}</p>}
              <WeeklyTimetable entries={data.entries} periods={data.periods} detail={(e) => e.teacher_name ?? ""} />
            </div>
          )}
        </SectionCard>
      )}
    </div>
  );
}
