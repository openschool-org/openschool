import {
  usePrefectAppointmentsByStudent,
  useStudentActivities,
  useLeadershipRoles,
  useStudentAwards,
  useDisciplinaryRecords,
} from "@/features/portfolio/queries/useStudentPortfolio";
import { useStudentSocietyMemberships } from "@/features/portfolio/queries/useSocieties";
import { PrefectsTable, SocietiesTable, ActivitiesTable, LeadershipTable, AwardsTable, DisciplineTable } from "@/features/portfolio/components/PortfolioTables";
import LoadingSpinner from "@/shared/ui/LoadingSpinner";
import PortfolioSection from "@/shared/ui/PortfolioSection";
import { useT } from "@/shared/i18n/useT";

// Read-only rollup of everything the portfolio feature records for one student.
export default function StudentPortfolioSummary({ studentId }: { studentId: string }) {
  const { t } = useT();
  const prefects = usePrefectAppointmentsByStudent(studentId);
  const societies = useStudentSocietyMemberships(studentId);
  const activities = useStudentActivities(studentId);
  const leadership = useLeadershipRoles(studentId);
  const awards = useStudentAwards(studentId);
  const discipline = useDisciplinaryRecords(studentId);

  if ([prefects, societies, activities, leadership, awards, discipline].some((q) => q.isLoading)) return <LoadingSpinner />;

  return (
    <div className="os-grid os-gap-6">
      <PortfolioSection title={t("portfolio.prefects")} isEmpty={!prefects.data?.length} emptyMessage={t("portfolio.prefectsEmpty")}>
        <PrefectsTable rows={prefects.data ?? []} />
      </PortfolioSection>
      <PortfolioSection title={t("portfolio.societies")} isEmpty={!societies.data?.length} emptyMessage={t("portfolio.societiesEmpty")}>
        <SocietiesTable rows={societies.data ?? []} />
      </PortfolioSection>
      <PortfolioSection title={t("portfolio.activities")} isEmpty={!activities.data?.length} emptyMessage={t("portfolio.activitiesEmpty")}>
        <ActivitiesTable rows={activities.data ?? []} />
      </PortfolioSection>
      <PortfolioSection title={t("portfolio.leadership")} isEmpty={!leadership.data?.length && !awards.data?.length} emptyMessage={t("portfolio.leadershipEmpty")}>
        {!!leadership.data?.length && <LeadershipTable rows={leadership.data} className="os-mb-4" />}
        {!!awards.data?.length && <AwardsTable rows={awards.data} />}
      </PortfolioSection>
      <PortfolioSection title={t("portfolio.discipline")} isEmpty={!discipline.data?.length} emptyMessage={t("portfolio.disciplineEmpty")}>
        <DisciplineTable rows={discipline.data ?? []} />
      </PortfolioSection>
    </div>
  );
}
