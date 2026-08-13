import { Idea } from "@carbon/icons-react";
import { SkeletonText } from "@carbon/react";
import { useMySociety } from "../../queries/useSocieties";
import { isNotFoundError } from "../../lib/errorMessage";
import EmptyState from "../../components/common/EmptyState";
import ErrorMessage from "../../components/common/ErrorMessage";
import SocietyRoster from "../../components/societies/SocietyRoster";

// Visible to any teacher, but only shows something for the one who is
// Teacher-in-Charge of a society this year — mirrors how a Section Head
// only sees leadership data scoped to their own grade.
export default function MySociety() {
  const { data: society, isLoading, isError, error, refetch } = useMySociety();
  const notTic = isNotFoundError(error);

  return (
    <div className="os-page">
      <div className="os-page__header">
        <div className="os-page__header-left">
          <h1 className="os-page__title">My Society</h1>
          <p className="os-page__subtitle">Manage your society's roster and member roles.</p>
        </div>
      </div>

      {isLoading && <SkeletonText width="40%" />}

      {isError && !notTic && <ErrorMessage message="Could not load your society." onRetry={refetch} />}

      {notTic && (
        <EmptyState
          title="Not a Teacher-in-Charge"
          description="You aren't the Teacher-in-Charge of any society this academic year."
        />
      )}

      {society && (
        <div className="os-section">
          <div className="os-section__header">
            <h2 className="os-section__title" style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <Idea size={16} style={{ fill: "#406AAF" }} /> {society.name}
            </h2>
          </div>
          <div className="os-section__body">
            <SocietyRoster societyId={society.id} />
          </div>
        </div>
      )}
    </div>
  );
}
