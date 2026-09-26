import { SkeletonText } from "@carbon/react";
import { useCurrentAcademicYear } from "@/features/school/queries/useAcademicYears";
import { useMyTeacherSchedule } from "@/features/timetable/queries/useTimetables";
import TimetableByDay from "@/features/timetable/components/TimetableByDay";
import EmptyState from "@/shared/ui/EmptyState";
import ErrorMessage from "@/shared/ui/ErrorMessage";

export default function TeacherTimetable() {
  const { data: currentYear } = useCurrentAcademicYear();
  const { data: schedule, isLoading, isError, refetch } = useMyTeacherSchedule(currentYear?.id ?? "");

  return (
    <div className="os-page">
      <div className="os-page__header">
        <div className="os-page__header-left">
          <h1 className="os-page__title">My timetable</h1>
          <p className="os-page__subtitle">{currentYear?.label ?? ""}</p>
        </div>
      </div>

      {isLoading ? (
        <div className="os-section os-p-6"><SkeletonText width="40%" /></div>
      ) : isError ? (
        <div className="os-section"><ErrorMessage message="Could not load your timetable." onRetry={refetch} /></div>
      ) : !schedule?.length ? (
        <div className="os-section"><EmptyState title="No published classes yet" description="Your teaching schedule will appear here once a timetable is published." /></div>
      ) : (
        <TimetableByDay entries={schedule} asSections getRowId={(_e, i) => String(i)} middle={{ key: "class", header: "Class", render: (e) => `${e.grade_name} - ${e.class_name}` }} />
      )}
    </div>
  );
}
