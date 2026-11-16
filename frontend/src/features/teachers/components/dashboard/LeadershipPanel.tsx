import { Card } from "antd";
import type { PositionSummary } from "@/features/positions/api/position";
import { POSITION_RANK } from "@/shared/lib/constants/people";

function reachText(summary: PositionSummary): string {
  if (summary.rank === POSITION_RANK.principal || summary.notify_whole_school) return "You can send notifications to the whole school.";
  if (summary.rank === POSITION_RANK.vicePrincipal) return "You can send notifications to your assigned grades.";
  return "You can send notifications to your assigned grade and its staff.";
}

// Only for Principal, Vice Principal and Section Head; a class teacher's reach is already obvious.
export default function LeadershipPanel({ summary }: { summary: PositionSummary }) {
  return (
    <Card className="os-dash-card" title="Your reach">
      <p className="os-m-0 os-text-sm os-c-secondary os-lh-normal">{reachText(summary)}</p>
    </Card>
  );
}
