import { Link } from "react-router";
import { SkeletonText, Button } from "@carbon/react";
import { Renew } from "@carbon/icons-react";
import { useReviewQueue } from "@/features/timetable/queries/useTimetables";
import EmptyState from "@/shared/ui/EmptyState";
import ErrorMessage from "@/shared/ui/ErrorMessage";
import TimetableReviewRow from "@/features/timetable/components/TimetableReviewRow";

const MAX_ROWS = 3;

// Only Section Heads can act on the review queue, so only they see this panel.
export default function TimetableReviewPanel({ academicYearId }: { academicYearId: string }) {
  const { data: queue, isLoading, isError, refetch } = useReviewQueue(academicYearId);

  return (
    <div className="os-section">
      <div className="os-section__header">
        <h2 className="os-section__title os-flex os-items-center os-gap-2">
          <Renew size={16} className="os-fill-accent" /> Timetable review
        </h2>
      </div>

      {isLoading ? (
        <div className="os-py-4 os-px-6">
          <SkeletonText width="60%" />
        </div>
      ) : isError ? (
        <div className="os-py-4 os-px-6">
          <ErrorMessage message="Could not load the review queue." onRetry={refetch} />
        </div>
      ) : !queue || queue.length === 0 ? (
        <div className="os-py-4 os-px-6">
          <EmptyState title="Nothing pending review" description="Timetables submitted for grades you head will show up here." />
        </div>
      ) : (
        <>
          {queue.slice(0, MAX_ROWS).map((t) => (
            <TimetableReviewRow key={t.id} timetable={t} />
          ))}
          {queue.length > MAX_ROWS && (
            <div className="os-py-3 os-px-6">
              <Button kind="ghost" size="sm" as={Link} to="/t/timetable/review">
                View all {queue.length} pending →
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
