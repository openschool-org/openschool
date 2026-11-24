import { Link } from "react-router";
import type { MarkHistoryTerm } from "@/features/marks/api/termMark";
import GradeBadge from "@/features/marks/components/GradeBadge";
import { markPercent } from "@/features/marks/lib/grade";
import SectionCard from "@/shared/ui/SectionCard";
import EmptyState from "@/shared/ui/EmptyState";
import { useT } from "@/shared/i18n/useT";

// The most recent term that has marks, one row per subject.
export default function LatestResultsPanel({ term }: { term: MarkHistoryTerm | null }) {
  const { t } = useT();
  return (
    <SectionCard
      title={term ? `${t("student.latestResults")} · ${term.name}` : t("student.latestResults")}
      meta={<Link to="/s/marks">{t("student.viewAll")}</Link>}
      flush
    >
      {!term ? (
        <EmptyState title={t("marks.historyEmptyTitle")} description={t("marks.historyEmptyDesc")} />
      ) : (
        <ul className="os-dash-list">
          {term.marks.slice(0, 5).map((m) => (
            <li key={m.id} className="os-dash-list__row">
              <div className="os-dash-list__main">
                <p className="os-dash-list__title">{m.subject_name}</p>
                <p className="os-dash-list__sub">{m.teacher_name || m.subject_code}</p>
              </div>
              <span className="os-flex os-items-center os-gap-3">
                <span className="os-fw-600">{m.is_absent ? t("table.absentShort") : `${Number(m.marks)} / ${Number(m.max_marks)}`}</span>
                <GradeBadge percent={markPercent(m)} />
              </span>
            </li>
          ))}
        </ul>
      )}
    </SectionCard>
  );
}
