import { Link } from "react-router";
import { Card, Skeleton } from "antd";
import { useReviewQueue } from "@/features/timetable/queries/useTimetables";
import EmptyState from "@/shared/ui/EmptyState";
import ErrorMessage from "@/shared/ui/ErrorMessage";
import TimetableReviewRow from "@/features/timetable/components/TimetableReviewRow";

const MAX_ROWS = 3;

// Only Section Heads can act on the review queue, so only they see this panel.
export default function TimetableReviewPanel({ academicYearId }: { academicYearId: string }) {
  const { data: queue, isLoading, isError, refetch } = useReviewQueue(academicYearId);
  const extra = queue && queue.length > MAX_ROWS ? <Link to="/t/timetable/review">View all {queue.length}</Link> : null;

  return (
    <Card className="os-dash-card is-flush" title="Timetable review" extra={extra}>
      {isLoading ? (
        <div className="os-dash-empty"><Skeleton title={false} paragraph={{ rows: 2 }} /></div>
      ) : isError ? (
        <div className="os-dash-empty"><ErrorMessage message="Could not load the review queue." onRetry={refetch} /></div>
      ) : !queue || queue.length === 0 ? (
        <EmptyState title="Nothing to review" description="Timetables sent for review in your grades will show up here." />
      ) : (
        queue.slice(0, MAX_ROWS).map((t) => <TimetableReviewRow key={t.id} timetable={t} />)
      )}
    </Card>
  );
}
