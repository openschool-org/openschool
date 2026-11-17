import { SkeletonText } from "@/shared/ui/Skeleton";
import { useCurrentAcademicYear } from "@/features/school/queries/useAcademicYears";
import { useReviewQueue } from "@/features/timetable/queries/useTimetables";
import EmptyState from "@/shared/ui/EmptyState";
import ErrorMessage from "@/shared/ui/ErrorMessage";
import TimetableReviewRow from "@/features/timetable/components/TimetableReviewRow";
import PageHeader from "@/shared/ui/PageHeader";

export default function TimetableReview() {
  const { data: currentYear } = useCurrentAcademicYear();
  const { data: queue, isLoading, isError, refetch } = useReviewQueue(currentYear?.id ?? "");

  return (
    <div className="os-page">
      <PageHeader title="Timetable review" subtitle={<>Timetables waiting for your approval for {currentYear?.label ?? "the current year"}.</>} />

      <div className="os-section">
        {isLoading ? (
          <div className="os-p-6">
            <SkeletonText width="40%" />
          </div>
        ) : isError ? (
          <ErrorMessage message="Could not load the review queue." onRetry={refetch} />
        ) : !queue || queue.length === 0 ? (
          <EmptyState title="Nothing pending review" description="Timetables submitted for grades you head will show up here." />
        ) : (
          queue.map((t) => <TimetableReviewRow key={t.id} timetable={t} />)
        )}
      </div>
    </div>
  );
}
