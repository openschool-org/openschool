import { Tag } from "antd";
import type { MarkHistoryTerm } from "@/features/marks/api/termMark";
import GradeBadge from "@/features/marks/components/GradeBadge";
import { averagePercent, markPercent } from "@/features/marks/lib/grade";
import DataGrid from "@/shared/ui/DataGrid";
import { formatDayMonthYear, todayISODate } from "@/shared/lib/date";
import { formatPercent } from "@/shared/lib/number";
import { useT } from "@/shared/i18n/useT";

// One term inside a year card: its dates, average and a row per subject.
export default function ResultsTermBlock({ term }: { term: MarkHistoryTerm }) {
  const { t } = useT();
  const average = averagePercent(term.marks);
  const notStarted = term.start_date > todayISODate();

  return (
    <section className="os-results-term">
      <div className="os-results-term__head">
        <div className="os-flex os-items-center os-gap-3 os-wrap">
          <h3 className="os-results-term__name">{term.name}</h3>
          <span className="os-results-term__dates">
            {formatDayMonthYear(term.start_date)} - {formatDayMonthYear(term.end_date)}
          </span>
          {term.is_current && <Tag color="blue">{t("marks.currentTerm")}</Tag>}
        </div>
        {average !== null && (
          <span className="os-results-term__avg">
            {t("marks.termAverage", { value: formatPercent(average, 1) })} · {t("marks.subjectsCount", { count: term.marks.length })}
          </span>
        )}
      </div>
      {term.marks.length === 0 ? (
        <p className="os-results-term__empty">{notStarted ? t("marks.termNotStarted") : t("marks.termNoMarks")}</p>
      ) : (
        <DataGrid
          rows={term.marks}
          getRowId={(m) => m.id}
          pagination={false}
          noHover
          columns={[
            { key: "code", header: t("table.code"), render: (m) => <span className="os-table__mono">{m.subject_code}</span> },
            { key: "subject", header: t("table.subject"), render: (m) => <span className="os-fw-500">{m.subject_name}</span> },
            { key: "teacher", header: t("table.teacher"), render: (m) => <span className="os-table__muted">{m.teacher_name || "-"}</span> },
            {
              key: "marks",
              header: t("table.marks"),
              align: "end",
              render: (m) => (m.is_absent ? t("table.absentShort") : `${Number(m.marks)} / ${Number(m.max_marks)}`),
            },
            { key: "grade", header: t("table.grade"), align: "end", render: (m) => <GradeBadge percent={markPercent(m)} /> },
          ]}
        />
      )}
    </section>
  );
}
