import { BankOutlined, CheckCircleOutlined, ClockCircleOutlined, TeamOutlined } from "@ant-design/icons";
import { useMyLeadershipOverview } from "@/features/positions/queries/usePositions";
import StatCard from "@/features/reports/components/dashboard/StatCard";

// Scoped counts for Principal, Vice Principal and Section Head, shown before the teacher's own classes.
export default function LeadershipOverviewPanel() {
  const { data: overview, isLoading, isError } = useMyLeadershipOverview(true);
  const scope = !overview ? "" : overview.scope === "school" ? "Whole school" : overview.grade_names.join(", ") || "Your grades";
  const card = { loading: isLoading, error: isError };

  return (
    <section aria-label="Leadership overview">
      <p className="os-dash-section-label">{scope ? `Overview: ${scope}` : "Overview"}</p>
      <div className="os-stat-grid">
        <StatCard {...card} label="Classes" value={overview?.class_count ?? 0} Icon={BankOutlined} />
        <StatCard {...card} label="Students" value={overview?.student_count ?? 0} Icon={TeamOutlined} />
        <StatCard {...card} label="Sessions marked today" value={overview?.sessions_marked_today ?? 0} Icon={CheckCircleOutlined} />
        <StatCard {...card} label="Sessions not marked yet" value={overview?.sessions_pending_today ?? 0} Icon={ClockCircleOutlined} />
      </div>
    </section>
  );
}
