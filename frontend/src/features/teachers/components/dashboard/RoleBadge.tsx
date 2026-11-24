import type { PositionRankLabel } from "@/features/positions/api/position";
import Pill, { type PillTone } from "@/shared/ui/Pill";

// One colour per rank so the badge reads as a hierarchy; grey means no position.
const RANK_TONE: Record<PositionRankLabel, PillTone> = {
  Principal: "purple",
  "Vice Principal": "accent",
  "Section Head": "info",
  "Class Teacher": "success",
  "Subject Teacher": "gold",
  Teacher: "neutral",
};

export default function RoleBadge({ rankLabel }: { rankLabel: PositionRankLabel }) {
  return <Pill tone={RANK_TONE[rankLabel]} variant="soft">{rankLabel}</Pill>;
}
