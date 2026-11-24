import { useCurrentAcademicYear } from "@/features/school/queries/useAcademicYears";
import { useReviewQueue } from "@/features/timetable/queries/useTimetables";
import EmptyState from "@/shared/ui/EmptyState";
import ErrorMessage from "@/shared/ui/ErrorMessage";
import LoadingSpinner from "@/shared/ui/LoadingSpinner";
import SectionCard from "@/shared/ui/SectionCard";
import TimetableReviewRow from "@/features/timetable/components/TimetableReviewRow";
import PageHeader from "@/shared/ui/PageHeader";

export default function TimetableReview() {
  const { data: currentYear } = useCurrentAcademicYear();
  const { data: queue, isLoading, isError, refetch } = useReviewQueue(currentYear?.id ?? "");
  return (
    <div className="os-page">
      <PageHeader title="Review timetables" subtitle={`Timetables waiting for your approval for ${currentYear?.label ?? "this year"}.`} />
      {isLoading ? (
        <LoadingSpinner />
      ) : isError ? (
        <ErrorMessage message="Could not load the review queue." onRetry={refetch} />
      ) : (
        <SectionCard title="Waiting for review" meta={<span className="os-text-sm os-c-tertiary">{queue?.length ?? 0} timetables</span>} flush>
          {!queue?.length ? (
            <EmptyState title="Nothing pending review" description="Timetables submitted for grades you head will show up here." />
          ) : (
            queue.map((t) => <TimetableReviewRow key={t.id} timetable={t} />)
          )}
        </SectionCard>
      )}
    </div>
  );
}
