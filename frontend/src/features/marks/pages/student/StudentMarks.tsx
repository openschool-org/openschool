import { useMyMarkHistory } from "@/features/students/queries/useStudentSelf";
import MarkHistory from "@/features/marks/components/MarkHistory";
import LoadingSpinner from "@/shared/ui/LoadingSpinner";
import ErrorMessage from "@/shared/ui/ErrorMessage";
import PageHeader from "@/shared/ui/PageHeader";
import { useT } from "@/shared/i18n/useT";

export default function StudentMarks() {
  const { t } = useT();
  const { data: years, isLoading, isError, refetch } = useMyMarkHistory();
  return (
    <div className="os-page">
      <PageHeader title={t("marks.results")} subtitle={t("page.results.sub")} />
      {isLoading ? <LoadingSpinner /> : isError ? <ErrorMessage message={t("common.loadFailed")} onRetry={refetch} /> : <MarkHistory years={years ?? []} />}
    </div>
  );
}
