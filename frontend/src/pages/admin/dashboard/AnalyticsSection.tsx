import { SkeletonText } from "@carbon/react";
import { useDashboardAnalytics } from "../../../queries/useDashboardAnalytics";
import ErrorMessage from "../../../components/common/ErrorMessage";
import type { CountRow, HouseCountRow, PerformanceRow, GrowthPoint, AttendanceTrendPoint } from "../../../services/dashboardAnalytics";

const ACCENT = "#406AAF";
const STATUS_COLORS = { present: "#24a148", late: "#f1c21b", absent: "#da1e28", leave: "#8a3ffc" };

function StatTile({ label, value, color }: { label: string; value: string | number; color: string }) {
  return (
    <div style={{ background: "#ffffff", border: "1px solid #e0e0e0", borderTop: `3px solid ${color}`, padding: "0.875rem 1rem" }}>
      <p style={{ margin: "0 0 0.25rem", fontSize: "0.6875rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.07em", color: "#525252" }}>
        {label}
      </p>
      <p style={{ margin: 0, fontSize: "1.75rem", fontWeight: 300, color: "#161616" }}>{value}</p>
    </div>
  );
}

function BarList({
  rows,
  color = ACCENT,
  formatValue,
}: {
  rows: { label: string; value: number }[];
  color?: string;
  formatValue?: (v: number) => string;
}) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.625rem" }}>
      {rows.map((r) => (
        <div key={r.label} title={`${r.label}: ${formatValue ? formatValue(r.value) : r.value}`}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem", marginBottom: "0.2rem" }}>
            <span style={{ color: "#525252" }}>{r.label}</span>
            <span style={{ fontWeight: 600, color: "#161616" }}>{formatValue ? formatValue(r.value) : r.value}</span>
          </div>
          <div style={{ height: "6px", background: "#e0e0e0", borderRadius: "3px" }}>
            <div style={{ width: `${(r.value / max) * 100}%`, height: "100%", background: color, borderRadius: "3px" }} />
          </div>
        </div>
      ))}
      {rows.length === 0 && <p style={{ fontSize: "0.8125rem", color: "#8d8d8d", margin: 0 }}>No data yet.</p>}
    </div>
  );
}

function Sparkline({ points }: { points: { label: string; pct: number }[] }) {
  if (points.length === 0) return <p style={{ fontSize: "0.8125rem", color: "#8d8d8d", margin: 0 }}>No attendance sessions in the last 14 days.</p>;
  const w = 100;
  const h = 32;
  const stepX = points.length > 1 ? w / (points.length - 1) : 0;
  const coords = points.map((p, i) => ({ x: i * stepX, y: h - (p.pct / 100) * h }));
  const path = coords.map((c, i) => `${i === 0 ? "M" : "L"}${c.x.toFixed(1)},${c.y.toFixed(1)}`).join(" ");

  return (
    <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" style={{ width: "100%", height: "64px" }}>
      <path d={path} fill="none" stroke={ACCENT} strokeWidth={2} vectorEffect="non-scaling-stroke" />
      {coords.map((c, i) => (
        <circle key={points[i].label} cx={c.x} cy={c.y} r={1.6} fill={ACCENT}>
          <title>{`${points[i].label}: ${points[i].pct}% present`}</title>
        </circle>
      ))}
    </svg>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="os-section">
      <div className="os-section__header">
        <h2 className="os-section__title">{title}</h2>
      </div>
      <div className="os-section__body">{children}</div>
    </div>
  );
}

export default function AnalyticsSection() {
  const { data, isLoading, isError, refetch } = useDashboardAnalytics();

  if (isLoading) {
    return (
      <div className="os-section">
        <div className="os-section__body" style={{ padding: "1.5rem" }}>
          <SkeletonText width="40%" />
          <SkeletonText width="70%" />
          <SkeletonText width="55%" />
        </div>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="os-section">
        <div className="os-section__body">
          <ErrorMessage message="Could not load analytics." onRetry={refetch} />
        </div>
      </div>
    );
  }

  const genderRows: CountRow[] = data.student.gender_distribution.map((g) => ({
    label: g.label[0].toUpperCase() + g.label.slice(1),
    count: g.count,
  }));

  const houseRows: HouseCountRow[] = data.student.house_distribution;
  const trendPoints = data.student.attendance_trend.map((t: AttendanceTrendPoint) => ({
    label: new Date(t.date).toLocaleDateString(undefined, { month: "short", day: "numeric" }),
    pct: t.total_count > 0 ? Math.round((t.present_count / t.total_count) * 100) : 0,
  }));

  return (
    <>
      <h2 style={{ fontSize: "1rem", fontWeight: 600, margin: "2rem 0 1rem" }}>Analytics</h2>

      {/* Student analytics */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem" }}>
        <Section title="Students by Grade">
          <BarList rows={data.student.by_grade.map((r: CountRow) => ({ label: r.label, value: r.count }))} />
        </Section>
        <Section title="Attendance Trend (last 14 days)">
          <Sparkline points={trendPoints} />
        </Section>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem" }}>
        <Section title="Gender Distribution">
          <BarList rows={genderRows.map((r) => ({ label: r.label, value: r.count }))} color="#8a3ffc" />
        </Section>
        <Section title="House Distribution">
          <div style={{ display: "flex", flexDirection: "column", gap: "0.625rem" }}>
            {houseRows.map((h) => {
              const max = Math.max(1, ...houseRows.map((r) => r.count));
              return (
                <div key={h.name}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem", marginBottom: "0.2rem" }}>
                    <span style={{ color: "#525252" }}>{h.name}</span>
                    <span style={{ fontWeight: 600, color: "#161616" }}>{h.count}</span>
                  </div>
                  <div style={{ height: "6px", background: "#e0e0e0", borderRadius: "3px" }}>
                    <div style={{ width: `${(h.count / max) * 100}%`, height: "100%", background: h.color, borderRadius: "3px" }} />
                  </div>
                </div>
              );
            })}
            {houseRows.length === 0 && <p style={{ fontSize: "0.8125rem", color: "#8d8d8d", margin: 0 }}>No houses yet.</p>}
          </div>
        </Section>
      </div>

      {/* Staff analytics */}
      <div className="os-stat-grid" style={{ marginTop: "1.5rem" }}>
        <StatTile label="Academic Staff" value={data.staff.academic_staff_count} color={ACCENT} />
        <StatTile label="Non-Academic Staff" value={data.staff.non_academic_staff_count} color="#8a3ffc" />
        <StatTile label="Notifications Sent" value={data.school.notifications_sent_count} color="#0f62fe" />
        <StatTile label="Timetable Completion" value={`${Math.round(data.school.timetable_completion_pct)}%`} color="#24a148" />
      </div>

      <Section title="Staff Attendance This Month">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "0.75rem" }}>
          {[
            { label: "Present", value: data.staff.attendance_this_month.present_count, color: STATUS_COLORS.present },
            { label: "Late", value: data.staff.attendance_this_month.late_count, color: STATUS_COLORS.late },
            { label: "Absent", value: data.staff.attendance_this_month.absent_count, color: STATUS_COLORS.absent },
            { label: "Leave", value: data.staff.attendance_this_month.leave_count, color: STATUS_COLORS.leave },
          ].map((s) => (
            <div key={s.label} style={{ textAlign: "center", padding: "0.75rem", border: "1px solid #f4f4f4" }}>
              <p style={{ margin: "0 0 0.25rem", fontSize: "1.25rem", fontWeight: 600, color: s.color }}>{s.value}</p>
              <p style={{ margin: 0, fontSize: "0.75rem", color: "#8d8d8d" }}>{s.label}</p>
            </div>
          ))}
        </div>
      </Section>

      {/* Academic analytics */}
      <div className="os-stat-grid">
        <StatTile label="Examination Average" value={`${data.academic.examination_average}%`} color={ACCENT} />
        <StatTile label="Students With Marks" value={data.academic.students_with_marks} color="#0f62fe" />
        <StatTile label="Overall Attendance %" value={`${Math.round(data.academic.attendance_percentage)}%`} color="#24a148" />
        <StatTile label="Mark Entries This Term" value={data.academic.examination_entries} color="#8a3ffc" />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem" }}>
        <Section title="Subject Performance (avg %, current term)">
          <BarList
            rows={data.academic.subject_performance.map((r: PerformanceRow) => ({ label: r.label, value: r.average_percentage }))}
            formatValue={(v) => `${v}%`}
          />
        </Section>
        <Section title="Grade-wise Performance (avg %, current term)">
          <BarList
            rows={data.academic.grade_wise_performance.map((r: PerformanceRow) => ({ label: r.label, value: r.average_percentage }))}
            color="#0f62fe"
            formatValue={(v) => `${v}%`}
          />
        </Section>
      </div>

      {/* School analytics */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem" }}>
        <Section title="Student Growth by Year">
          <BarList rows={data.school.student_growth.map((r: GrowthPoint) => ({ label: r.label, value: r.count }))} />
        </Section>
        <Section title="Staff Growth by Joining Year">
          <BarList rows={data.school.staff_growth.map((r: GrowthPoint) => ({ label: r.label, value: r.count }))} color="#8a3ffc" />
        </Section>
      </div>
    </>
  );
}
