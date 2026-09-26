import { SkeletonText, Tabs, TabList, Tab, TabPanels, TabPanel } from "@carbon/react";
import { useDashboardAnalytics, useLeadershipAnalytics } from "@/features/reports/queries/useDashboardAnalytics";
import ErrorMessage from "@/shared/ui/ErrorMessage";
import { formatShortDayMonth } from "@/shared/lib/date";
import {
  Section,
  StatTile,
  BarList,
  Sparkline,
  TrendSummary,
  DonutChart,
} from "@/features/reports/components/ChartPrimitives";
import { ACCENT, STATUS_COLORS, CHART_BLUE, CHART_PURPLE, CATEGORICAL_PALETTE, GENDER_COLORS } from "@/features/reports/components/chartColors";
import type { CountRow, AttendanceTrendPoint } from "@/features/reports/api/dashboardAnalytics";

// scope picks the endpoint: admin analytics, or the Principal / Vice Principal scoped view with the same shape (ADR 0002).
export default function Analytics({ scope = "admin" }: { scope?: "admin" | "leadership" }) {
  const adminQuery = useDashboardAnalytics(scope === "admin");
  const leadershipQuery = useLeadershipAnalytics(scope === "leadership");
  const { data, isLoading, isError, refetch } = scope === "leadership" ? leadershipQuery : adminQuery;

  return (
    <div className="os-page">
      <div className="os-page__header">
        <div className="os-page__header-left">
          <h1 className="os-page__title">Analytics</h1>
          <p className="os-page__subtitle">Marks, attendance, houses and growth across the school.</p>
        </div>
      </div>

      {isLoading && (
        <div className="os-section">
          <div className="os-section__body os-p-6">
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
            <TabPanel className="os-p-0">
              <StudentsPanel data={data} />
            </TabPanel>
            <TabPanel className="os-p-0">
              <AcademicsPanel data={data} />
            </TabPanel>
            <TabPanel className="os-p-0">
              <StaffPanel data={data} />
            </TabPanel>
            <TabPanel className="os-p-0">
              <SchoolPanel data={data} />
            </TabPanel>
          </TabPanels>
        </Tabs>
      )}
    </div>
  );
}

type AnalyticsData = NonNullable<ReturnType<typeof useDashboardAnalytics>["data"]>;

function StudentsPanel({ data }: { data: AnalyticsData }) {
  const genderRows: CountRow[] = data.student.gender_distribution.map((g) => ({
    label: g.label ? g.label[0].toUpperCase() + g.label.slice(1) : "Unspecified",
    count: g.count,
  }));

  const trendPoints = data.student.attendance_trend.map((t: AttendanceTrendPoint) => ({
    label: formatShortDayMonth(t.date),
    pct: t.total_count > 0 ? Math.round((t.present_count / t.total_count) * 100) : 0,
  }));

  return (
    <div className="os-my-4 os-mx-0">
      <div className="os-stat-grid">
        <StatTile label="Total students" value={data.student.total} color={ACCENT} />
      </div>

      <div className="os-grid os-grid-cols-2 os-gap-6 os-mt-6">
        <Section title="Gender distribution">
          <DonutChart
            slices={genderRows.map((r) => ({
              label: r.label,
              value: r.count,
              color: GENDER_COLORS[r.label] ?? "var(--os-text-tertiary)",
            }))}
          />
        </Section>
        <Section title="House distribution">
          <DonutChart
            slices={data.student.house_distribution.map((h, i) => ({
              label: h.name,
              value: h.count,
              color: h.color || CATEGORICAL_PALETTE[i % CATEGORICAL_PALETTE.length],
            }))}
          />
        </Section>
      </div>

      <div className="os-grid os-grid-cols-2 os-gap-6 os-mt-6">
        <Section title="Students by grade">
          <BarList rows={data.student.by_grade.map((r: CountRow) => ({ label: r.label, value: r.count }))} />
        </Section>
        <Section title="Students by class">
          <BarList
            rows={data.student.by_class.map((r: CountRow) => ({ label: r.label, value: r.count }))}
            color={CHART_BLUE}
          />
        </Section>
      </div>

      <div className="os-mt-6">
        <Section title="Attendance trend (last 14 days)">
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

function AcademicsPanel({ data }: { data: AnalyticsData }) {
  return (
    <div className="os-my-4 os-mx-0">
      <div className="os-stat-grid">
        <StatTile label="Examination average" value={`${data.academic.examination_average}%`} color={ACCENT} />
        <StatTile label="Students with marks" value={data.academic.students_with_marks} color={CHART_BLUE} />
        <StatTile label="Overall attendance %" value={`${Math.round(data.academic.attendance_percentage)}%`} color={STATUS_COLORS.present} />
        <StatTile label="Mark entries this term" value={data.academic.examination_entries} color={CHART_PURPLE} />
      </div>

      <div className="os-grid os-grid-cols-2 os-gap-6 os-mt-6">
        <Section title="Marks by subject (avg %, current term)">
          <BarList
            rows={data.academic.subject_performance.map((r) => ({ label: r.label, value: r.average_percentage }))}
            formatValue={(v) => `${v}%`}
          />
        </Section>
        <Section title="Marks by grade (avg %, current term)">
          <BarList
            rows={data.academic.grade_wise_performance.map((r) => ({ label: r.label, value: r.average_percentage }))}
            color={CHART_BLUE}
            formatValue={(v) => `${v}%`}
          />
        </Section>
      </div>

      <div className="os-mt-6">
        <Section title="Marks by class (avg %, current term)">
          <BarList
            rows={data.academic.class_wise_performance.map((r) => ({ label: r.label, value: r.average_percentage }))}
            color={STATUS_COLORS.present}
            formatValue={(v) => `${v}%`}
          />
        </Section>
      </div>
    </div>
  );
}

function StaffPanel({ data }: { data: AnalyticsData }) {
  return (
    <div className="os-my-4 os-mx-0">
      <div className="os-stat-grid">
        <StatTile label="Academic staff" value={data.staff.academic_staff_count} color={ACCENT} />
        <StatTile label="Non-academic staff" value={data.staff.non_academic_staff_count} color={CHART_PURPLE} />
      </div>

      <div className="os-grid os-grid-cols-2 os-gap-6 os-mt-6">
        <Section title="Staff attendance this month">
          <DonutChart
            slices={[
              { label: "Present", value: data.staff.attendance_this_month.present_count, color: STATUS_COLORS.present },
              { label: "Late", value: data.staff.attendance_this_month.late_count, color: STATUS_COLORS.late },
              { label: "Absent", value: data.staff.attendance_this_month.absent_count, color: STATUS_COLORS.absent },
              { label: "Leave", value: data.staff.attendance_this_month.leave_count, color: STATUS_COLORS.leave },
            ]}
          />
        </Section>
        <TrendSummary title="Staff growth by joining year" points={data.school.staff_growth} color={CHART_PURPLE} />
      </div>
    </div>
  );
}

function SchoolPanel({ data }: { data: AnalyticsData }) {
  return (
    <div className="os-my-4 os-mx-0">
      <div className="os-stat-grid">
        <StatTile label="Notifications sent" value={data.school.notifications_sent_count} color={CHART_BLUE} />
        <StatTile label="Timetable completion" value={`${Math.round(data.school.timetable_completion_pct)}%`} color={STATUS_COLORS.present} />
        <StatTile label="Total classes" value={data.school.total_classes} color={ACCENT} />
        <StatTile label="Published timetables" value={data.school.published_classes} color={CHART_PURPLE} />
      </div>

      <div className="os-mt-6">
        <TrendSummary title="Student growth by year" points={data.school.student_growth} color={ACCENT} />
      </div>
    </div>
  );
}
