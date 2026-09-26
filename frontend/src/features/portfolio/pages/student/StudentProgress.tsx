import { useMyStudentProfile } from "@/features/students/queries/useStudentSelf";
import { useProgressReports } from "@/features/portfolio/queries/useStudentPortfolio";
import ProgressReportsTable from "@/features/portfolio/components/ProgressReportsTable";
import LoadingSpinner from "@/shared/ui/LoadingSpinner";
import EmptyState from "@/shared/ui/EmptyState";
import ErrorMessage from "@/shared/ui/ErrorMessage";
import SectionCard from "@/shared/ui/SectionCard";
import { useT } from "@/shared/i18n/useT";

export default function StudentProgress() {
  const { t } = useT();
  const profile = useMyStudentProfile();
  const reports = useProgressReports(profile.data?.id ?? "");

  if (profile.isLoading || reports.isLoading) return <LoadingSpinner />;
  if (profile.isError || reports.isError) {
    return (
      <div className="os-p-8">
        <ErrorMessage message={t("progress.loadFailed")} onRetry={() => { profile.refetch(); reports.refetch(); }} />
      </div>
    );
  }
  return (
    <div className="os-p-8">
      <SectionCard title={t("progress.title")} flush>
        {reports.data?.length ? (
          <ProgressReportsTable rows={reports.data} />
        ) : (
          <EmptyState title={t("progress.emptyTitle")} description={t("progress.emptyStudent")} />
        )}
      </SectionCard>
    </div>
  );
}
