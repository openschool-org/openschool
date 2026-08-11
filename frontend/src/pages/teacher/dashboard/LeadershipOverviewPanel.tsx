import { Location } from "@carbon/icons-react";
import type { LeadershipOverviewSummary } from "../../../services/position";

const ACCENT = "#406AAF";

// The §9.3 "deepened" panel — real scoped counts (not just label text) for
// Principal/Vice Principal/Section Head. Sits alongside LeadershipPanel
// (notification reach), doesn't replace it.
export default function LeadershipOverviewPanel({ overview }: { overview: LeadershipOverviewSummary }) {
  const scopeLabel = overview.scope === "school" ? "Whole school" : overview.grade_names.join(", ") || "Your grades";

  const rows = [
    { label: "Classes", value: String(overview.class_count), color: "#161616" },
    { label: "Students", value: String(overview.student_count), color: ACCENT },
    { label: "Sessions Marked Today", value: String(overview.sessions_marked_today), color: "#24a148" },
    {
      label: "Sessions Pending Today",
      value: String(overview.sessions_pending_today),
      color: overview.sessions_pending_today > 0 ? "#f1c21b" : "#8d8d8d",
    },
  ];

  return (
    <div className="os-section">
      <div className="os-section__header">
        <h2 className="os-section__title" style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <Location size={16} style={{ fill: ACCENT }} /> Overview — {scopeLabel}
        </h2>
      </div>
      <div className="os-section__body" style={{ padding: "0.75rem 1.5rem" }}>
        {rows.map(({ label, value, color }) => (
          <div
            key={label}
            style={{
              display: "flex",
              justifyContent: "space-between",
              padding: "0.45rem 0",
              borderBottom: "1px solid #f4f4f4",
              fontSize: "0.8125rem",
            }}
          >
            <span style={{ color: "#525252" }}>{label}</span>
            <span style={{ fontWeight: 600, color }}>{value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
