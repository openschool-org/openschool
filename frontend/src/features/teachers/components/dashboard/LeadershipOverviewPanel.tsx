import { Location } from "@carbon/icons-react";
import type { LeadershipOverviewSummary } from "@/features/positions/api/position";
import InfoRow from "@/shared/ui/InfoRow";

// Scoped counts for Principal, Vice Principal and Section Head; complements LeadershipPanel.
export default function LeadershipOverviewPanel({ overview }: { overview: LeadershipOverviewSummary }) {
  const scopeLabel = overview.scope === "school" ? "Whole school" : overview.grade_names.join(", ") || "Your grades";

  const rows = [
    { label: "Classes", value: overview.class_count, color: "var(--os-text-primary)" },
    { label: "Students", value: overview.student_count, color: "var(--os-accent)" },
    { label: "Sessions marked today", value: overview.sessions_marked_today, color: "var(--os-success)" },
    {
      label: "Sessions pending today",
      value: overview.sessions_pending_today,
      color: overview.sessions_pending_today > 0 ? "var(--os-warning)" : "var(--os-text-tertiary)",
    },
  ];

  return (
    <div className="os-section">
      <div className="os-section__header">
        <h2 className="os-section__title os-flex os-items-center os-gap-2">
          <Location size={16} className="os-fill-accent" /> Overview - {scopeLabel}
        </h2>
      </div>
      <div className="os-section__body os-py-3 os-px-6">
        {rows.map(({ label, value, color }, i) => (
          <InfoRow key={label} label={label} value={<span style={{ color }}>{value}</span>} bold divider={i < rows.length - 1} />
        ))}
      </div>
    </div>
  );
}
