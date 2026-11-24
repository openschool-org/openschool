import { useMyMarkHistory } from "@/features/students/queries/useStudentSelf";
import MarkHistory from "@/features/marks/components/MarkHistory";
import LoadingSpinner from "@/shared/ui/LoadingSpinner";
import ErrorMessage from "@/shared/ui/ErrorMessage";
import { useT } from "@/shared/i18n/useT";

export default function StudentMarks() {
  const { t } = useT();
  const { data: years, isLoading, isError, refetch } = useMyMarkHistory();
  if (isLoading) return <LoadingSpinner />;
  return (
    <div className="os-p-8">
      <div className="os-section os-mb-6">
        <div className="os-section__header">
          <h2 className="os-section__title">{t("marks.results")}</h2>
        </div>
      </div>
      {isError ? <ErrorMessage message={t("common.loadFailed")} onRetry={refetch} /> : <MarkHistory years={years ?? []} />}
    </div>
  );
}
