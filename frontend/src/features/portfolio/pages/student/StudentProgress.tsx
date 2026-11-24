import { useMyStudentProfile } from "@/features/students/queries/useStudentSelf";
import { useProgressReports } from "@/features/portfolio/queries/useStudentPortfolio";
import ProgressReportsTable from "@/features/portfolio/components/ProgressReportsTable";
import LoadingSpinner from "@/shared/ui/LoadingSpinner";
import EmptyState from "@/shared/ui/EmptyState";
import ErrorMessage from "@/shared/ui/ErrorMessage";
import SectionCard from "@/shared/ui/SectionCard";
import PageHeader from "@/shared/ui/PageHeader";
import { useT } from "@/shared/i18n/useT";

export default function StudentProgress() {
  const { t } = useT();
  const profile = useMyStudentProfile();
  const reports = useProgressReports(profile.data?.id ?? "");

  const loading = profile.isLoading || reports.isLoading;
  const failed = profile.isError || reports.isError;
  return (
    <div className="os-page">
      <PageHeader title={t("nav.progressReports")} subtitle={t("page.progress.sub")} />
      {loading ? (
        <LoadingSpinner />
      ) : failed ? (
        <ErrorMessage message={t("progress.loadFailed")} onRetry={() => { profile.refetch(); reports.refetch(); }} />
      ) : (
      <SectionCard title={t("progress.title")} flush>
        {reports.data?.length ? (
          <ProgressReportsTable rows={reports.data} />
        ) : (
          <EmptyState title={t("progress.emptyTitle")} description={t("progress.emptyStudent")} />
        )}
      </SectionCard>
      )}
    </div>
  );
}
