import { gradeLetter } from "@/features/marks/lib/grade";

// Letter grade as a solid badge; nothing to show for an absent mark.
export default function GradeBadge({ percent }: { percent: number | null }) {
  if (percent === null) return <span className="os-table__muted">-</span>;
  const letter = gradeLetter(percent);
  return <span className={`os-grade-badge is-${letter.toLowerCase()}`}>{letter}</span>;
}
