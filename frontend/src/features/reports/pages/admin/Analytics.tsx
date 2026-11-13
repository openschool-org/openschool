import { useState } from "react";
import { Skeleton, Tabs } from "antd";
import { useDashboardAnalytics, useLeadershipAnalytics } from "@/features/reports/queries/useDashboardAnalytics";
import StudentsPanel from "@/features/reports/components/analytics/StudentsPanel";
import { AcademicsPanel, SchoolPanel, StaffPanel } from "@/features/reports/components/analytics/OtherPanels";
import ErrorMessage from "@/shared/ui/ErrorMessage";

type Tab = "students" | "academics" | "staff" | "school";
const TABS: { key: Tab; label: string }[] = [
  { key: "students", label: "Students" },
  { key: "academics", label: "Academics" },
  { key: "staff", label: "Staff" },
  { key: "school", label: "School" },
];

// scope picks the endpoint: admin analytics, or the Principal / Vice Principal scoped view with the same shape (ADR 0002).
export default function Analytics({ scope = "admin" }: { scope?: "admin" | "leadership" }) {
  const adminQuery = useDashboardAnalytics(scope === "admin");
  const leadershipQuery = useLeadershipAnalytics(scope === "leadership");
  const { data, isLoading, isError, refetch } = scope === "leadership" ? leadershipQuery : adminQuery;
  const [tab, setTab] = useState<Tab>("students");

  return (
    <div className="os-page">
      <div className="os-page__header">
        <div className="os-page__header-left">
          <h1 className="os-page__title">Analytics</h1>
          <p className="os-page__subtitle">Enrolment, marks, attendance and growth across the school.</p>
        </div>
      </div>

      {isLoading ? (
        <div className="os-stack os-gap-4">
          <div className="os-stat-grid">{[0, 1, 2, 3].map((i) => <div key={i} className="os-chart-card os-p-6"><Skeleton active title={false} paragraph={{ rows: 2 }} /></div>)}</div>
          <div className="os-chart-card os-p-6"><Skeleton active paragraph={{ rows: 6 }} /></div>
        </div>
      ) : isError || !data ? (
        <div className="os-section"><ErrorMessage message="Could not load analytics." onRetry={refetch} /></div>
      ) : (
        <Tabs
          className="os-detail-tabs"
          activeKey={tab}
          onChange={(k) => setTab(k as Tab)}
          items={TABS.map((t) => ({
            key: t.key,
            label: t.label,
            children:
              t.key !== tab ? null
              : t.key === "students" ? <StudentsPanel data={data} />
              : t.key === "academics" ? <AcademicsPanel data={data} />
              : t.key === "staff" ? <StaffPanel data={data} />
              : <SchoolPanel data={data} />,
          }))}
        />
      )}
    </div>
  );
}
