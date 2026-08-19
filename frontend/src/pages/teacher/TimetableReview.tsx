import { SkeletonText } from "@carbon/react";
import { useCurrentAcademicYear } from "../../queries/useAcademicYears";
import { useReviewQueue } from "../../queries/timetable/useTimetables";
import EmptyState from "../../components/common/EmptyState";
import ErrorMessage from "../../components/common/ErrorMessage";
import TimetableReviewRow from "../../components/timetable/TimetableReviewRow";

export default function TimetableReview() {
  const { data: currentYear } = useCurrentAcademicYear();
  const { data: queue, isLoading, isError, refetch } = useReviewQueue(currentYear?.id ?? "");

  return (
    <div className="os-page">
      <div className="os-page__header">
        <div className="os-page__header-left">
          <h1 className="os-page__title">Timetable Review</h1>
          <p className="os-page__subtitle">
            Timetables submitted for your approval as a section head, for {currentYear?.label ?? "the current year"}.
          </p>
        </div>
      </div>

      <div className="os-section">
        {isLoading ? (
          <div style={{ padding: "1.5rem" }}>
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
