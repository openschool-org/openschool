import { Link } from "react-router";
import { SkeletonText } from "@carbon/react";
import { ChevronRight, EventSchedule, Report } from "@carbon/icons-react";
import type { Child, ChildSummary } from "@/features/parent/api/parent";
import { getInitials } from "@/shared/lib/name";
import { formatPercent } from "@/shared/lib/number";
import { useT } from "@/shared/i18n/useT";

interface Props {
  child: Child;
  summary: ChildSummary | undefined;
  summaryLoading: boolean;
}

// One child on the parent's first screen, with the two numbers parents ask about most.
export default function ChildCard({ child, summary, summaryLoading }: Props) {
  const { t } = useT();
  const sessions = summary?.sessions_this_month ?? 0;
  const attendance = sessions ? (summary!.attended_this_month / sessions) * 100 : null;

  return (
    <Link to={`/p/children/${child.id}`} className="os-child-card os-bg-layer os-border os-no-underline">
      <div className="os-flex os-items-center os-gap-3h">
        <div className="os-profile__avatar os-w-2t os-h-2t os-text-md">{getInitials(child.full_name)}</div>
        <div className="os-flex-1 os-min-w-0">
          <p className="os-mt-0 os-mx-0 os-mb-h os-fw-600 os-text-md os-c-primary">{child.full_name}</p>
          <p className="os-m-0 os-text-sm os-c-secondary">
            {child.index_number}
            {child.class_name ? ` · ${child.class_name}` : ""}
            {child.grade_name ? ` · ${child.grade_name}` : ""}
          </p>
        </div>
        <ChevronRight size={18} className="os-fill-tertiary os-shrink-0" />
      </div>

      <dl className="os-child-card__stats">
        <div>
          <dt><EventSchedule size={14} /> {t("student.attendanceThisMonth")}</dt>
          <dd>
            {summaryLoading ? <SkeletonText width="3rem" /> : attendance === null ? t("parent.noData") : formatPercent(attendance)}
            {!summaryLoading && sessions > 0 && (
              <span className="os-child-card__meta">{t("parent.daysAttended", { attended: summary!.attended_this_month, total: sessions })}</span>
            )}
          </dd>
        </div>
        <div>
          <dt><Report size={14} /> {t("parent.latestAverage")}</dt>
          <dd>
            {summaryLoading ? <SkeletonText width="3rem" /> : summary?.has_marks ? formatPercent(summary.latest_average_percent) : t("parent.noData")}
            {!summaryLoading && summary?.has_marks && <span className="os-child-card__meta">{summary.latest_term_name}</span>}
          </dd>
        </div>
      </dl>
    </Link>
  );
}
