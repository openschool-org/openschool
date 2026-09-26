import { Link } from "react-router";
import { EventSchedule, UserMultiple, Notification, ArrowRight } from "@carbon/icons-react";
import type { PositionRankLabel } from "@/features/positions/api/position";

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
    { label: "Mark attendance", desc: "Record today's session", path: "/t/attendance", Icon: EventSchedule },
    { label: "My classes", desc: "View class rosters", path: "/t/classes", Icon: UserMultiple },
    { label: "Send notification", desc: notifyDescription(rankLabel, notifyWholeSchool), path: "/t/notifications", Icon: Notification },
  ];

  return (
    <div className="os-section">
      <div className="os-section__header"><h2 className="os-section__title">Quick actions</h2></div>
      <div className="os-p-3">
        {actions.map(({ label, desc, path, Icon }) => (
          <Link key={label} to={path} className="os-no-underline">
            <div className="os-quick-action">
              <Icon size={20} className="os-fill-accent os-shrink-0" />
              <div className="os-flex-1">
                <p className="os-mt-0 os-mx-0 os-mb-h os-fw-600 os-text-sm os-c-primary">{label}</p>
                <p className="os-m-0 os-text-xs os-c-secondary">{desc}</p>
              </div>
              <ArrowRight size={14} className="os-fill-tertiary" />
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
