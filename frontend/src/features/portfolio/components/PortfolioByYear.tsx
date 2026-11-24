import { Tag } from "antd";
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
    { prefectRank: (r) => translateValue(t, "prefect", r), societyRole: (r) => capitalize(r.replace("_", " ")), category: (c) => capitalize(c) },
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
            <ul className="os-folio">
              {year.items.map((item) => {
                const Icon = KIND_ICON[item.kind];
                return (
                  <li key={item.id} className={`os-folio__item is-${item.kind}`}>
                    <span className="os-folio__icon" aria-hidden="true"><Icon /></span>
                    <div className="os-min-w-0 os-flex-1">
                      <p className="os-folio__kind">{t(`portfolio.kind.${item.kind}`)}</p>
                      <p className="os-folio__title">{item.title}</p>
                      {item.detail && <p className="os-folio__detail">{item.detail}</p>}
                    </div>
                    <div className="os-folio__side">
                      {item.badge && <Tag>{item.badge}</Tag>}
                      {item.date && <span className="os-folio__date">{formatDayMonthYear(item.date)}</span>}
                    </div>
                  </li>
                );
              })}
            </ul>
          </article>
        ))
      )}

      <SectionCard title={t("portfolio.conduct")} flush>
        {records.length === 0 ? (
          <p className="os-folio__clear"><SafetyCertificateOutlined /> {t("portfolio.conductClear")}</p>
        ) : (
          <ul className="os-folio">
            {records.map((r) => (
              <li key={r.id} className="os-folio__item is-discipline">
                <span className="os-folio__icon" aria-hidden="true"><WarningOutlined /></span>
                <div className="os-min-w-0 os-flex-1">
                  <p className="os-folio__title">{r.description}</p>
                  {r.action_taken && <p className="os-folio__detail">{r.action_taken}</p>}
                </div>
                <div className="os-folio__side">
                  <Tag>{capitalize(r.severity)}</Tag>
                  <span className="os-folio__date">{formatDayMonthYear(r.incident_date)}</span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </SectionCard>
    </div>
  );
}
