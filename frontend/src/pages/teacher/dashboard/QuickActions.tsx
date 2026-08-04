import { Link } from "react-router";
import { EventSchedule, UserMultiple, Notification, ArrowRight } from "@carbon/icons-react";
import type { PositionRankLabel } from "../../../services/position";

const ACCENT = "#406AAF";

function notifyDescription(rankLabel: PositionRankLabel, notifyWholeSchool: boolean): string {
  if (notifyWholeSchool) return "Notify the whole school";
  switch (rankLabel) {
    case "Section Head":
      return "Notify your assigned grade(s)";
    case "Class Teacher":
      return "Notify your class and its guardians";
    case "Subject Teacher":
      return "Notify students in your subject";
    default:
      return "Send a scoped announcement";
  }
}

export default function QuickActions({
  rankLabel,
  notifyWholeSchool,
}: {
  rankLabel: PositionRankLabel;
  notifyWholeSchool: boolean;
}) {
  const actions = [
    { label: "Mark Attendance", desc: "Record today's session", path: "/t/attendance", Icon: EventSchedule },
    { label: "My Classes", desc: "View class rosters", path: "/t/classes", Icon: UserMultiple },
    { label: "Send Notification", desc: notifyDescription(rankLabel, notifyWholeSchool), path: "/t/notifications", Icon: Notification },
  ];

  return (
    <div className="os-section">
      <div className="os-section__header"><h2 className="os-section__title">Quick Actions</h2></div>
      <div style={{ padding: "0.75rem" }}>
        {actions.map(({ label, desc, path, Icon }) => (
          <Link key={label} to={path} style={{ textDecoration: "none" }}>
            <div
              style={{ display: "flex", alignItems: "center", gap: "0.875rem", padding: "0.75rem", border: "1px solid #e0e0e0", marginBottom: "0.5rem", cursor: "pointer", transition: "border-color 0.15s" }}
              onMouseEnter={(e) => (e.currentTarget.style.borderColor = ACCENT)}
              onMouseLeave={(e) => (e.currentTarget.style.borderColor = "#e0e0e0")}
            >
              <Icon size={20} style={{ fill: ACCENT, flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <p style={{ margin: "0 0 0.1rem", fontWeight: 600, fontSize: "0.8125rem", color: "#161616" }}>{label}</p>
                <p style={{ margin: 0, fontSize: "0.75rem", color: "#525252" }}>{desc}</p>
              </div>
              <ArrowRight size={14} style={{ fill: "#8d8d8d" }} />
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
