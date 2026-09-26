import { Idea } from "@carbon/icons-react";
import { SkeletonText } from "@carbon/react";
import { useMySociety } from "@/features/portfolio/queries/useSocieties";
import { isNotFoundError } from "@/shared/api/errors";
import EmptyState from "@/shared/ui/EmptyState";
import ErrorMessage from "@/shared/ui/ErrorMessage";
import SocietyRoster from "@/features/portfolio/components/SocietyRoster";

// Shows data only for the teacher in charge of a society this year.
export default function MySociety() {
  const { data: society, isLoading, isError, error, refetch } = useMySociety();
  const notTic = isNotFoundError(error);

  return (
    <div className="os-page">
      <div className="os-page__header">
        <div className="os-page__header-left">
          <h1 className="os-page__title">My society</h1>
          <p className="os-page__subtitle">Manage your society's roster and member roles.</p>
        </div>
      </div>

      {isLoading && <SkeletonText width="40%" />}

      {isError && !notTic && <ErrorMessage message="Could not load your society." onRetry={refetch} />}

      {notTic && (
        <EmptyState
          title="Not a teacher in charge"
          description="You aren't the Teacher-in-Charge of any society this academic year."
        />
      )}

      {society && (
        <div className="os-section">
          <div className="os-section__header">
            <h2 className="os-section__title os-flex os-items-center os-gap-2">
              <Idea size={16} className="os-fill-accent" /> {society.name}
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
