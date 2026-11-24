import { useMemo } from "react";
import { useMyMarkHistory, useMyStudentProfile } from "@/features/students/queries/useStudentSelf";
import PortfolioByYear from "@/features/portfolio/components/PortfolioByYear";
import LoadingSpinner from "@/shared/ui/LoadingSpinner";
import ErrorMessage from "@/shared/ui/ErrorMessage";
import PageHeader from "@/shared/ui/PageHeader";
import { useT } from "@/shared/i18n/useT";

export default function StudentPortfolio() {
  const { t } = useT();
  const { data: profile, isLoading, isError, refetch } = useMyStudentProfile();
  // Students cannot list academic years, so the year names come from their own class history.
  const { data: history } = useMyMarkHistory();
  const yearLabels = useMemo(() => Object.fromEntries((history ?? []).map((y) => [y.academic_year_id, y.academic_year])), [history]);

  if (isLoading) return <LoadingSpinner />;
  if (isError || !profile) {
    return (
      <div className="os-page">
        <ErrorMessage message={t("student.loadProfileFailed")} onRetry={refetch} />
      </div>
    );
  }
  return (
    <div className="os-page">
      <PageHeader title={t("portfolio.title")} subtitle={[profile.full_name, profile.class_name].filter(Boolean).join(" · ")} />
      <PortfolioByYear studentId={profile.id} yearLabels={yearLabels} />
    </div>
  );
}
