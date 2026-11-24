import { RightOutlined } from "@ant-design/icons";
import type { MarkHistoryYear } from "@/features/marks/api/termMark";
import ResultsTermBlock from "@/features/marks/components/ResultsTermBlock";
import { averagePercent } from "@/features/marks/lib/grade";
import EmptyState from "@/shared/ui/EmptyState";
import { formatPercent } from "@/shared/lib/number";
import { useT } from "@/shared/i18n/useT";

// Results year by year, newest first, each year holding its terms; shared by the student and parent portals.
export default function MarkHistory({ years }: { years: MarkHistoryYear[] }) {
  const { t } = useT();
  if (years.length === 0) return <EmptyState title={t("marks.historyEmptyTitle")} description={t("marks.historyEmptyDesc")} />;

  return (
    <div className="os-results">
      <p className="os-m-0 os-text-sm os-c-secondary">{t("marks.gradeKey")}</p>
      {years.map((year) => {
        const average = averagePercent(year.terms.flatMap((term) => term.marks));
        // Only the current year starts open, so its current term shows; past years start closed.
        const openByDefault = year.is_current;
        return (
          <details key={year.academic_year_id} className="os-results-year" open={openByDefault}>
            <summary className="os-results-year__head">
              <h2 className="os-results-year__title">
                <RightOutlined className="os-results-chevron" aria-hidden />
                {[year.academic_year, year.grade_name, year.class_name].filter(Boolean).join(" | ")}
              </h2>
              <div className="os-results-year__stats">
                {year.is_current && <span>{t("marks.currentYear")}</span>}
                {average !== null && <span>{t("marks.yearAverage", { value: formatPercent(average, 1) })}</span>}
              </div>
            </summary>
            <div className="os-results-year__terms">
              {year.terms.map((term) => (
                <ResultsTermBlock key={term.id} term={term} />
              ))}
            </div>
          </details>
        );
      })}
    </div>
  );
}
