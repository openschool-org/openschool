import { Tag } from "antd";
import type { PositionRankLabel } from "@/features/positions/api/position";

// One colour per rank so the badge reads as a hierarchy; the plain tag means no position.
const RANK_COLOR: Record<PositionRankLabel, string | undefined> = {
  Principal: "purple",
  "Vice Principal": "blue",
  "Section Head": "cyan",
  "Class Teacher": "geekblue",
  "Subject Teacher": "green",
  Teacher: undefined,
};

export default function RoleBadge({ rankLabel }: { rankLabel: PositionRankLabel }) {
  return <Tag color={RANK_COLOR[rankLabel]} variant="filled">{rankLabel}</Tag>;
}
