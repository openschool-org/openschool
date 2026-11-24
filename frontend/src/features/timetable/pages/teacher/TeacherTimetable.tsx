import LoadingSpinner from "@/shared/ui/LoadingSpinner";
import { useCurrentAcademicYear } from "@/features/school/queries/useAcademicYears";
import { useMyTeacherSchedule } from "@/features/timetable/queries/useTimetables";
import { useTeacherBells } from "@/features/timetable/hooks/useTeacherBells";
import WeeklyTimetable from "@/features/timetable/components/WeeklyTimetable";
import EmptyState from "@/shared/ui/EmptyState";
import ErrorMessage from "@/shared/ui/ErrorMessage";
import SectionCard from "@/shared/ui/SectionCard";
import { classLabel } from "@/shared/lib/classLabel";
import PageHeader from "@/shared/ui/PageHeader";

export default function TeacherTimetable() {
  const { data: currentYear } = useCurrentAcademicYear();
  const yearId = currentYear?.id ?? "";
  const { data: schedule, isLoading, isError, refetch } = useMyTeacherSchedule(yearId);
  // Times show when all her classes share one bell schedule; otherwise rows are P1, P2 only.
  const bells = useTeacherBells(schedule, yearId);
  const classes = new Set((schedule ?? []).map((e) => e.class_id)).size;

  return (
    <div className="os-page">
      <PageHeader title="My timetable" subtitle={currentYear?.label ?? ""} />
      <SectionCard
        title="Weekly timetable"
        meta={schedule?.length ? <span className="os-text-sm os-c-tertiary">{schedule.length} periods a week · {classes} {classes === 1 ? "class" : "classes"}</span> : undefined}
      >
        {isLoading ? (
          <LoadingSpinner />
        ) : isError ? (
          <ErrorMessage message="Could not load your timetable." onRetry={refetch} />
        ) : !schedule?.length ? (
          <EmptyState title="No published classes yet" description="Your teaching schedule will appear here once a timetable is published." />
        ) : (
          <WeeklyTimetable entries={schedule} periods={bells} detail={(e) => classLabel(e.grade_name, e.class_name)} />
        )}
      </SectionCard>
    </div>
  );
}
