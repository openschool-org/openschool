// This file renders the full Analytics admin page: Students, Academics,
// Staff and School tabs built from the /dashboard/analytics response, using
// the shared StatTile/BarList/Sparkline/TrendSummary/DonutChart primitives.

import { SkeletonText, Tabs, TabList, Tab, TabPanels, TabPanel } from "@carbon/react";
import { useDashboardAnalytics } from "../../../queries/useDashboardAnalytics";
import ErrorMessage from "../../../components/common/ErrorMessage";
import {
  Section,
  StatTile,
  BarList,
  Sparkline,
  TrendSummary,
  DonutChart,
} from "../../../components/analytics/ChartPrimitives";
import { ACCENT, STATUS_COLORS } from "../../../components/analytics/chartColors";
import type { CountRow, AttendanceTrendPoint } from "../../../services/dashboardAnalytics";

const HOUSE_FALLBACK_COLORS = ["#406AAF", "#8a3ffc", "#24a148", "#f1c21b", "#da1e28", "#0f62fe"];
const GENDER_COLORS: Record<string, string> = { Male: "#406AAF", Female: "#d02670", Unspecified: "#8d8d8d" };

export default function Analytics() {
  const { data, isLoading, isError, refetch } = useDashboardAnalytics();

  return (
    <div className="os-page">
      <div className="os-page__header">
        <div className="os-page__header-left">
          <h1 className="os-page__title">Analytics</h1>
          <p className="os-page__subtitle">
            School-wide reporting across students, academics, staff and
            operations — marks by subject, attendance, house distribution and
            growth trends.
          </p>
        </div>
      </div>

      {isLoading && (
        <div className="os-section">
          <div className="os-section__body" style={{ padding: "1.5rem" }}>
            <SkeletonText width="40%" />
            <SkeletonText width="70%" />
            <SkeletonText width="55%" />
          </div>
        </div>
      )}

      {!isLoading && (isError || !data) && (
        <div className="os-section">
          <div className="os-section__body">
            <ErrorMessage message="Could not load analytics." onRetry={refetch} />
          </div>
        </div>
      )}

      {!isLoading && data && (
        <Tabs>
          <TabList aria-label="Analytics sections">
            <Tab>Students</Tab>
            <Tab>Academics</Tab>
            <Tab>Staff</Tab>
            <Tab>School</Tab>
          </TabList>
          <TabPanels>
            <TabPanel style={{ padding: 0 }}>
              <StudentsPanel data={data} />
            </TabPanel>
            <TabPanel style={{ padding: 0 }}>
              <AcademicsPanel data={data} />
            </TabPanel>
            <TabPanel style={{ padding: 0 }}>
              <StaffPanel data={data} />
            </TabPanel>
            <TabPanel style={{ padding: 0 }}>
              <SchoolPanel data={data} />
            </TabPanel>
          </TabPanels>
        </Tabs>
      )}
    </div>
  );
}

type Analytics = NonNullable<ReturnType<typeof useDashboardAnalytics>["data"]>;

function StudentsPanel({ data }: { data: Analytics }) {
  const genderRows: CountRow[] = data.student.gender_distribution.map((g) => ({
    label: g.label ? g.label[0].toUpperCase() + g.label.slice(1) : "Unspecified",
    count: g.count,
  }));

  const trendPoints = data.student.attendance_trend.map((t: AttendanceTrendPoint) => ({
    label: new Date(t.date).toLocaleDateString(undefined, { month: "short", day: "numeric" }),
    pct: t.total_count > 0 ? Math.round((t.present_count / t.total_count) * 100) : 0,
  }));

  return (
    <div style={{ margin: "1rem 0" }}>
      <div className="os-stat-grid">
        <StatTile label="Total Students" value={data.student.total} color={ACCENT} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem", marginTop: "1.5rem" }}>
        <Section title="Gender Distribution">
          <DonutChart
            slices={genderRows.map((r) => ({
              label: r.label,
              value: r.count,
              color: GENDER_COLORS[r.label] ?? "#8d8d8d",
            }))}
          />
        </Section>
        <Section title="House Distribution">
          <DonutChart
            slices={data.student.house_distribution.map((h, i) => ({
              label: h.name,
              value: h.count,
              color: h.color || HOUSE_FALLBACK_COLORS[i % HOUSE_FALLBACK_COLORS.length],
            }))}
          />
        </Section>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem", marginTop: "1.5rem" }}>
        <Section title="Students by Grade">
          <BarList rows={data.student.by_grade.map((r: CountRow) => ({ label: r.label, value: r.count }))} />
        </Section>
        <Section title="Students by Class">
          <BarList
            rows={data.student.by_class.map((r: CountRow) => ({ label: r.label, value: r.count }))}
            color="#0f62fe"
          />
        </Section>
      </div>

      <div style={{ marginTop: "1.5rem" }}>
        <Section title="Attendance Trend (last 14 days)">
          <Sparkline
            points={trendPoints.map((p) => ({ label: p.label, value: p.pct }))}
            min={0}
            max={100}
            formatValue={(v) => `${v}% present`}
            emptyMessage="No attendance sessions in the last 14 days."
          />
        </Section>
      </div>
    </div>
  );
}

function AcademicsPanel({ data }: { data: Analytics }) {
  return (
    <div style={{ margin: "1rem 0" }}>
      <div className="os-stat-grid">
        <StatTile label="Examination Average" value={`${data.academic.examination_average}%`} color={ACCENT} />
        <StatTile label="Students With Marks" value={data.academic.students_with_marks} color="#0f62fe" />
        <StatTile label="Overall Attendance %" value={`${Math.round(data.academic.attendance_percentage)}%`} color="#24a148" />
        <StatTile label="Mark Entries This Term" value={data.academic.examination_entries} color="#8a3ffc" />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem", marginTop: "1.5rem" }}>
        <Section title="Marks by Subject (avg %, current term)">
          <BarList
            rows={data.academic.subject_performance.map((r) => ({ label: r.label, value: r.average_percentage }))}
            formatValue={(v) => `${v}%`}
          />
        </Section>
        <Section title="Marks by Grade (avg %, current term)">
          <BarList
            rows={data.academic.grade_wise_performance.map((r) => ({ label: r.label, value: r.average_percentage }))}
            color="#0f62fe"
            formatValue={(v) => `${v}%`}
          />
        </Section>
      </div>

      <div style={{ marginTop: "1.5rem" }}>
        <Section title="Marks by Class (avg %, current term)">
          <BarList
            rows={data.academic.class_wise_performance.map((r) => ({ label: r.label, value: r.average_percentage }))}
            color="#24a148"
            formatValue={(v) => `${v}%`}
          />
        </Section>
      </div>
    </div>
  );
}

function StaffPanel({ data }: { data: Analytics }) {
  return (
    <div style={{ margin: "1rem 0" }}>
      <div className="os-stat-grid">
        <StatTile label="Academic Staff" value={data.staff.academic_staff_count} color={ACCENT} />
        <StatTile label="Non-Academic Staff" value={data.staff.non_academic_staff_count} color="#8a3ffc" />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem", marginTop: "1.5rem" }}>
        <Section title="Staff Attendance This Month">
          <DonutChart
            slices={[
              { label: "Present", value: data.staff.attendance_this_month.present_count, color: STATUS_COLORS.present },
              { label: "Late", value: data.staff.attendance_this_month.late_count, color: STATUS_COLORS.late },
              { label: "Absent", value: data.staff.attendance_this_month.absent_count, color: STATUS_COLORS.absent },
              { label: "Leave", value: data.staff.attendance_this_month.leave_count, color: STATUS_COLORS.leave },
            ]}
          />
        </Section>
        <TrendSummary title="Staff Growth by Joining Year" points={data.school.staff_growth} color="#8a3ffc" />
      </div>
    </div>
  );
}

function SchoolPanel({ data }: { data: Analytics }) {
  return (
    <div style={{ margin: "1rem 0" }}>
      <div className="os-stat-grid">
        <StatTile label="Notifications Sent" value={data.school.notifications_sent_count} color="#0f62fe" />
        <StatTile label="Timetable Completion" value={`${Math.round(data.school.timetable_completion_pct)}%`} color="#24a148" />
        <StatTile label="Total Classes" value={data.school.total_classes} color={ACCENT} />
        <StatTile label="Published Timetables" value={data.school.published_classes} color="#8a3ffc" />
      </div>

      <div style={{ marginTop: "1.5rem" }}>
        <TrendSummary title="Student Growth by Year" points={data.school.student_growth} color={ACCENT} />
      </div>
    </div>
  );
}
