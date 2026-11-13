import { useState } from "react";
import { Button, Progress } from "antd";
import type { DashboardAnalytics, GrowthPoint, PerformanceRow } from "@/features/reports/api/dashboardAnalytics";
import { BarList, ChartCard, DonutChart, KpiTile } from "@/features/reports/components/ChartPrimitives";
import TrendChart from "@/features/reports/components/TrendChart";
import { CHART_1, STATUS_COLORS } from "@/features/reports/components/chartColors";

const pct = (v: number) => `${Math.round(v)}%`;
const byScore = (rows: PerformanceRow[]) => [...rows].sort((a, b) => b.average_percentage - a.average_percentage).map((r) => ({ label: r.label, value: Math.round(r.average_percentage) }));

// Long lists show the top rows first, with a toggle for the rest.
function TopBars({ rows, limit = 10, empty }: { rows: { label: string; value: number }[]; limit?: number; empty: string }) {
  const [all, setAll] = useState(false);
  const shown = all ? rows : rows.slice(0, limit);
  return (
    <>
      <BarList rows={shown} max={100} formatValue={pct} empty={empty} />
      {rows.length > limit && (
        <Button type="link" size="small" className="os-mt-3 os-p-0" onClick={() => setAll((v) => !v)}>
          {all ? "Show top 10" : `Show all ${rows.length}`}
        </Button>
      )}
    </>
  );
}

function Growth({ title, points, noun }: { title: string; points: GrowthPoint[]; noun: string }) {
  const latest = points.at(-1);
  const prior = points.at(-2);
  const delta = latest && prior ? latest.count - prior.count : null;
  return (
    <ChartCard
      title={title}
      subtitle={latest ? `${latest.count} ${noun} as of ${latest.label}` : undefined}
      extra={delta !== null && prior && (
        <span className={`os-delta ${delta > 0 ? "is-up" : delta < 0 ? "is-down" : ""}`}>{delta > 0 ? "+" : ""}{delta} vs {prior.label}</span>
      )}
    >
      <TrendChart points={points.map((p) => ({ label: p.label, value: p.count }))} formatValue={(v) => `${v} ${noun}`} empty="No data yet." />
    </ChartCard>
  );
}

export function AcademicsPanel({ data }: { data: DashboardAnalytics }) {
  const a = data.academic;
  return (
    <div className="os-analytics">
      <div className="os-stat-grid">
        <KpiTile label="Exam average" value={pct(a.examination_average)} hint="Current term, all subjects" />
        <KpiTile label="Students with marks" value={a.students_with_marks} hint={`${a.examination_entries} mark entries this term`} />
        <KpiTile label="Attendance" value={pct(a.attendance_percentage)} hint="Overall, this term" />
        <KpiTile label="Subjects marked" value={a.subject_performance.length} hint={`${a.class_wise_performance.length} classes with marks`} />
      </div>
      <div className="os-analytics__row">
        <ChartCard title="By subject" subtitle="Average mark, current term">
          <TopBars rows={byScore(a.subject_performance)} empty="No marks entered this term." />
        </ChartCard>
        <ChartCard title="By grade" subtitle="Average mark, current term">
          <BarList rows={a.grade_wise_performance.map((r) => ({ label: r.label, value: Math.round(r.average_percentage) }))} max={100} formatValue={pct} empty="No marks entered this term." />
        </ChartCard>
      </div>
      <ChartCard title="By class" subtitle="Average mark, current term, highest first">
        <TopBars rows={byScore(a.class_wise_performance)} empty="No marks entered this term." />
      </ChartCard>
    </div>
  );
}

export function StaffPanel({ data }: { data: DashboardAnalytics }) {
  const st = data.staff;
  const m = st.attendance_this_month;
  const total = m.present_count + m.late_count + m.absent_count + m.leave_count;
  return (
    <div className="os-analytics">
      <div className="os-stat-grid os-grid-cols-3">
        <KpiTile label="Academic staff" value={st.academic_staff_count} />
        <KpiTile label="Non-academic staff" value={st.non_academic_staff_count} />
        <KpiTile label="Present this month" value={total ? pct(((m.present_count + m.late_count) / total) * 100) : "–"} hint={total ? `${total} staff-days recorded` : "No staff attendance yet"} />
      </div>
      <div className="os-analytics__row">
        <ChartCard title="Staff attendance" subtitle="This month">
          <DonutChart
            centerLabel="staff-days"
            slices={[
              { label: "Present", value: m.present_count, color: STATUS_COLORS.present },
              { label: "Late", value: m.late_count, color: STATUS_COLORS.late },
              { label: "Absent", value: m.absent_count, color: STATUS_COLORS.absent },
              { label: "Leave", value: m.leave_count, color: STATUS_COLORS.leave },
            ]}
          />
        </ChartCard>
        <Growth title="Staff growth" points={data.school.staff_growth} noun="staff" />
      </div>
    </div>
  );
}

export function SchoolPanel({ data }: { data: DashboardAnalytics }) {
  const sc = data.school;
  return (
    <div className="os-analytics">
      <div className="os-stat-grid">
        <KpiTile label="Classes" value={sc.total_classes} />
        <KpiTile label="Published timetables" value={sc.published_classes} hint={`of ${sc.total_classes} classes`} />
        <KpiTile label="Timetable completion" value={pct(sc.timetable_completion_pct)} />
        <KpiTile label="Notifications sent" value={sc.notifications_sent_count} />
      </div>
      <div className="os-analytics__row os-analytics__row--wide">
        <Growth title="Student growth" points={sc.student_growth} noun="students" />
        <ChartCard title="Timetables" subtitle="Classes with a published timetable">
          <div className="os-flex os-col os-gap-3">
            <Progress percent={Math.round(sc.timetable_completion_pct)} strokeColor={CHART_1} />
            <p className="os-m-0 os-text-sm os-c-secondary">{sc.published_classes} of {sc.total_classes} classes published.</p>
          </div>
        </ChartCard>
      </div>
    </div>
  );
}
