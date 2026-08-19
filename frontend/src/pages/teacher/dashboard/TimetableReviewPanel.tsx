import { Link } from "react-router";
import { SkeletonText, Button } from "@carbon/react";
import { Renew } from "@carbon/icons-react";
import { useReviewQueue } from "../../../queries/timetable/useTimetables";
import EmptyState from "../../../components/common/EmptyState";
import ErrorMessage from "../../../components/common/ErrorMessage";
import TimetableReviewRow from "../../../components/timetable/TimetableReviewRow";

const ACCENT = "#406AAF";
const MAX_ROWS = 3;

// Only rendered for Section Head — timetable review authorization is tied
// to the section_heads/grade_sections tables, so a Class or Subject
// Teacher's queue is always empty and a Principal/Vice Principal (who
// monitor rather than act) don't need it either.
export default function TimetableReviewPanel({ academicYearId }: { academicYearId: string }) {
  const { data: queue, isLoading, isError, refetch } = useReviewQueue(academicYearId);

  return (
    <div className="os-section">
      <div className="os-section__header">
        <h2 className="os-section__title" style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <Renew size={16} style={{ fill: ACCENT }} /> Timetable Review
        </h2>
      </div>

      {isLoading ? (
        <div style={{ padding: "1rem 1.5rem" }}>
          <SkeletonText width="60%" />
        </div>
      ) : isError ? (
        <div style={{ padding: "1rem 1.5rem" }}>
          <ErrorMessage message="Could not load the review queue." onRetry={refetch} />
        </div>
      ) : !queue || queue.length === 0 ? (
        <div style={{ padding: "1rem 1.5rem" }}>
          <EmptyState title="Nothing pending review" description="Timetables submitted for grades you head will show up here." />
        </div>
      ) : (
        <>
          {queue.slice(0, MAX_ROWS).map((t) => (
            <TimetableReviewRow key={t.id} timetable={t} />
          ))}
          {queue.length > MAX_ROWS && (
            <div style={{ padding: "0.75rem 1.5rem" }}>
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
