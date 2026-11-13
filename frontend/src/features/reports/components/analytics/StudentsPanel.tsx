import { useMemo, useState } from "react";
import { Tag } from "antd";
import { ApartmentOutlined, TeamOutlined, UserOutlined } from "@ant-design/icons";
import type { CountRow, DashboardAnalytics } from "@/features/reports/api/dashboardAnalytics";
import { BarList, ChartCard, DonutChart, KpiTile } from "@/features/reports/components/ChartPrimitives";
import TrendChart from "@/features/reports/components/TrendChart";
import { CATEGORICAL_PALETTE, GENDER_COLORS, MUTED } from "@/features/reports/components/chartColors";
import { formatShortDayMonth } from "@/shared/lib/date";

const capitalise = (s: string) => (s ? s[0].toUpperCase() + s.slice(1) : "Unspecified");
const largest = (rows: CountRow[]) => rows.reduce<CountRow | null>((top, r) => (!top || r.count > top.count ? r : top), null);

export default function StudentsPanel({ data }: { data: DashboardAnalytics }) {
  const s = data.student;
  const activeGrades = s.by_grade.filter((r) => r.count > 0).length;
  const avgClass = s.by_class.length ? Math.round(s.total / s.by_class.length) : 0;
  const trend = s.attendance_trend.map((t) => ({
    label: formatShortDayMonth(t.date),
    value: t.total_count > 0 ? Math.round((t.present_count / t.total_count) * 100) : 0,
  }));
  const latest = trend.at(-1);

  return (
    <div className="os-analytics">
      <div className="os-stat-grid">
        <KpiTile icon={<UserOutlined />} label="Students" value={s.total} hint={`Across ${activeGrades} grade${activeGrades === 1 ? "" : "s"}`} />
        <KpiTile icon={<ApartmentOutlined />} label="Active classes" value={s.by_class.length} hint={avgClass ? `About ${avgClass} students per class` : "No students placed yet"} />
        <KpiTile icon={<TeamOutlined />} label="Houses" value={s.house_distribution.length} hint={`${s.house_distribution.reduce((n, h) => n + h.count, 0)} students assigned`} />
        <KpiTile label="Latest attendance" value={latest ? `${latest.value}%` : "–"} hint={latest ? `Last session ${latest.label}` : "No sessions yet"} />
      </div>

      <div className="os-analytics__row os-analytics__row--wide">
        <ChartCard title="Attendance" subtitle="Share of students present, last 14 days">
          <TrendChart points={trend} min={0} max={100} formatValue={(v) => `${v}% present`} formatAxis={(v) => `${v}%`} empty="No attendance sessions in the last 14 days." />
        </ChartCard>
        <ChartCard title="At a glance">
          <Glance byGrade={s.by_grade} byClass={s.by_class} avgClass={avgClass} />
        </ChartCard>
      </div>

      <div className="os-analytics__row">
        <ChartCard title="Gender">
          <DonutChart centerLabel="students" slices={s.gender_distribution.map((g) => ({ label: capitalise(g.label), value: g.count, color: GENDER_COLORS[capitalise(g.label)] ?? MUTED }))} />
        </ChartCard>
        <ChartCard title="Houses">
          <DonutChart centerLabel="students" slices={s.house_distribution.map((h, i) => ({ label: h.name, value: h.count, color: h.color || CATEGORICAL_PALETTE[i] || MUTED }))} />
        </ChartCard>
      </div>

      <Enrolment byGrade={s.by_grade} byClass={s.by_class} />
    </div>
  );
}

function Glance({ byGrade, byClass, avgClass }: { byGrade: CountRow[]; byClass: CountRow[]; avgClass: number }) {
  const g = largest(byGrade);
  const c = largest(byClass);
  const facts = [
    { label: "Largest grade", value: g && g.count > 0 ? g.label : "–", meta: g && g.count > 0 ? `${g.count} students` : undefined },
    { label: "Largest class", value: c && c.count > 0 ? c.label : "–", meta: c && c.count > 0 ? `${c.count} students` : undefined },
    { label: "Average class size", value: avgClass ? `${avgClass}` : "–", meta: avgClass ? "students" : undefined },
  ];
  return (
    <dl className="os-glance">
      {facts.map((f) => (
        <div key={f.label} className="os-glance__item">
          <dt>{f.label}</dt>
          <dd><strong>{f.value}</strong>{f.meta && <span> · {f.meta}</span>}</dd>
        </div>
      ))}
    </dl>
  );
}

// Grades on the left (click to drill in), that grade's classes on the right.
function Enrolment({ byGrade, byClass }: { byGrade: CountRow[]; byClass: CountRow[] }) {
  const first = byGrade.find((r) => r.count > 0)?.label ?? byGrade[0]?.label ?? "";
  const [picked, setPicked] = useState(first);
  const grade = byGrade.some((r) => r.label === picked) ? picked : first;
  const classes = useMemo(() => {
    const prefix = `${grade} `;
    return byClass.filter((r) => r.label.startsWith(prefix)).map((r) => ({ label: r.label.slice(prefix.length), value: r.count }));
  }, [byClass, grade]);
  const gradeTotal = byGrade.find((r) => r.label === grade)?.count ?? 0;
  const top = Math.max(1, ...byGrade.map((r) => r.count));

  return (
    <ChartCard title="Enrolment by grade" subtitle="Pick a grade to see its classes">
      <div className="os-analytics__split">
        <BarList rows={byGrade.map((r) => ({ label: r.label, value: r.count }))} max={top} selected={grade} onSelect={setPicked} empty="No grades yet." />
        <div className="os-analytics__drill">
          <div className="os-flex os-items-center os-justify-between os-gap-2 os-mb-3">
            <h3 className="os-chart-card__subhead">{grade ? `Classes in ${grade}` : "Classes"}</h3>
            <Tag variant="filled">{gradeTotal} students</Tag>
          </div>
          <BarList rows={classes} empty="No classes in this grade." />
        </div>
      </div>
    </ChartCard>
  );
}
