import { Tag } from "@carbon/react";
import type { PositionRankLabel } from "../../../services/position";

// One color per rank so the badge reads as a hierarchy at a glance —
// darkest/most prominent at the top (Principal), plain gray for the
// no-position default so it doesn't visually compete with real ranks.
const RANK_TAG_TYPE: Record<PositionRankLabel, "purple" | "blue" | "teal" | "cyan" | "green" | "gray"> = {
  Principal: "purple",
  "Vice Principal": "blue",
  "Section Head": "teal",
  "Class Teacher": "cyan",
  "Subject Teacher": "green",
  Teacher: "gray",
};

export default function RoleBadge({ rankLabel }: { rankLabel: PositionRankLabel }) {
  return (
    <Tag type={RANK_TAG_TYPE[rankLabel]} size="sm">
      {rankLabel}
    </Tag>
  );
}
