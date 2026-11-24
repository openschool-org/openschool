import Pill from "@/shared/ui/Pill";
import { CrownOutlined, StarOutlined, TeamOutlined, TrophyOutlined, FireOutlined, SafetyCertificateOutlined, WarningOutlined } from "@ant-design/icons";
import {
  usePrefectAppointmentsByStudent,
  useStudentActivities,
  useLeadershipRoles,
  useStudentAwards,
  useDisciplinaryRecords,
} from "@/features/portfolio/queries/useStudentPortfolio";
import { useStudentSocietyMemberships } from "@/features/portfolio/queries/useSocieties";
import { groupPortfolio, type PortfolioKind } from "@/features/portfolio/components/portfolioItems";
import StatCard from "@/features/reports/components/dashboard/StatCard";
import LoadingSpinner from "@/shared/ui/LoadingSpinner";
import EmptyState from "@/shared/ui/EmptyState";
import SectionCard from "@/shared/ui/SectionCard";
import { capitalize } from "@/shared/lib/text";
import { formatDayMonthYear } from "@/shared/lib/date";
import { useT } from "@/shared/i18n/useT";
import { translateValue } from "@/shared/i18n/translateValue";

const KIND_ICON: Record<PortfolioKind, typeof CrownOutlined> = {
  prefect: CrownOutlined,
  leadership: StarOutlined,
  society: TeamOutlined,
  activity: FireOutlined,
  award: TrophyOutlined,
};

// A student's portfolio as one card per academic year, newest first; shared by the student and parent portals.
export default function PortfolioByYear({ studentId, yearLabels }: { studentId: string; yearLabels: Record<string, string> }) {
  const { t } = useT();
  const prefects = usePrefectAppointmentsByStudent(studentId);
  const societies = useStudentSocietyMemberships(studentId);
  const activities = useStudentActivities(studentId);
  const leadership = useLeadershipRoles(studentId);
  const awards = useStudentAwards(studentId);
  const discipline = useDisciplinaryRecords(studentId);
  const queries = [prefects, societies, activities, leadership, awards, discipline];
  if (queries.some((q) => q.isLoading)) return <LoadingSpinner />;

  const years = groupPortfolio(
    { prefects: prefects.data ?? [], societies: societies.data ?? [], leadership: leadership.data ?? [], activities: activities.data ?? [], awards: awards.data ?? [] },
    yearLabels,
    {
      prefectRank: (r) => translateValue(t, "prefect", r),
      societyRole: (r) => capitalize(r.replace("_", " ")),
      category: (c) => capitalize(c),
      former: (role) => t("portfolio.former", { role }),
      left: (date) => t("portfolio.left", { date: formatDayMonthYear(date) }),
    },
  );
  const records = discipline.data ?? [];

  return (
    <div className="os-grid os-gap-6">
      <div className="os-stat-grid os-mb-0">
        <StatCard label={t("portfolio.positions")} value={(prefects.data?.length ?? 0) + (leadership.data?.length ?? 0)} loading={false} Icon={CrownOutlined} />
        <StatCard label={t("portfolio.societies")} value={societies.data?.length ?? 0} loading={false} Icon={TeamOutlined} />
        <StatCard label={t("portfolio.activities")} value={activities.data?.length ?? 0} loading={false} Icon={FireOutlined} />
        <StatCard label={t("portfolio.awards")} value={awards.data?.length ?? 0} loading={false} Icon={TrophyOutlined} />
      </div>

      {years.length === 0 ? (
        <EmptyState title={t("portfolio.emptyTitle")} description={t("portfolio.emptyDesc")} />
      ) : (
        years.map((year) => (
          <article key={year.yearId} className="os-results-year">
            <header className="os-results-year__head">
              <h2 className="os-results-year__title">{year.label || t("portfolio.earlierYear")}</h2>
            </header>
            <div className="os-folio-grid">
              {year.items.map((item) => {
                const Icon = KIND_ICON[item.kind];
                return (
                  <article key={item.id} className={`os-folio-card is-${item.kind}`}>
                    <div className="os-folio-card__top">
                      <span className="os-folio-card__icon" aria-hidden="true"><Icon /></span>
                      <p className="os-folio-card__kind">{t(`portfolio.kind.${item.kind}`)}</p>
                    </div>
                    <p className="os-folio-card__title">{item.title}</p>
                    {item.detail && <p className="os-folio-card__detail">{item.detail}</p>}
                    {(item.badge || item.date) && (
                      <div className="os-folio-card__foot">
                        {item.badge ? <Pill>{item.badge}</Pill> : <span />}
                        {item.date && <span className="os-folio-card__date">{formatDayMonthYear(item.date)}</span>}
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          </article>
        ))
      )}

      <SectionCard title={t("portfolio.conduct")} flush>
        {records.length === 0 ? (
          <p className="os-folio__clear"><SafetyCertificateOutlined /> {t("portfolio.conductClear")}</p>
        ) : (
          <div className="os-folio-grid">
            {records.map((r) => (
              <article key={r.id} className="os-folio-card is-discipline">
                <div className="os-folio-card__top">
                  <span className="os-folio-card__icon" aria-hidden="true"><WarningOutlined /></span>
                  <p className="os-folio-card__kind">{t("portfolio.conduct")}</p>
                </div>
                <p className="os-folio-card__title">{r.description}</p>
                {r.action_taken && <p className="os-folio-card__detail">{r.action_taken}</p>}
                <div className="os-folio-card__foot">
                  <Pill tone={r.severity === "minor" ? "warning" : "danger"}>{capitalize(r.severity)}</Pill>
                  <span className="os-folio-card__date">{formatDayMonthYear(r.incident_date)}</span>
                </div>
              </article>
            ))}
          </div>
        )}
      </SectionCard>
    </div>
  );
}
