import { UserRole } from "@carbon/icons-react";
import type { PositionSummary } from "../../../services/position";

const ACCENT = "#406AAF";

function reachText(summary: PositionSummary): string {
  if (summary.rank_label === "Principal") return "You can notify the whole school.";
  if (summary.rank_label === "Vice Principal") {
    return summary.notify_whole_school
      ? "You've been granted whole-school notification reach."
      : "You can notify your assigned grade(s).";
  }
  return "You can notify your assigned grade and its staff.";
}

// Only rendered for ranks that carry school-wide or multi-grade
// responsibility (Principal, Vice Principal, Section Head) — a plain Class
// or Subject Teacher's reach is already obvious from their own classes, so
// this panel would just be noise for them.
export default function LeadershipPanel({ summary }: { summary: PositionSummary }) {
  return (
    <div className="os-section">
      <div className="os-section__header">
        <h2 className="os-section__title" style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <UserRole size={16} style={{ fill: ACCENT }} /> Leadership
        </h2>
      </div>
      <div style={{ padding: "1rem 1.5rem" }}>
        <p style={{ margin: 0, fontSize: "0.8125rem", color: "#525252", lineHeight: 1.5 }}>{reachText(summary)}</p>
      </div>
    </div>
  );
}
