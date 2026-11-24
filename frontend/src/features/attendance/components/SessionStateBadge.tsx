export type SessionState = "marked" | "pending" | "unmarked" | "locked";

const LABELS: Record<SessionState, string> = { marked: "Marked", pending: "Pending", unmarked: "Not marked", locked: "Locked" };

// Session and roster states in the same solid pill as the attendance statuses.
export default function SessionStateBadge({ state }: { state: SessionState }) {
  return <span className={`os-att-badge is-${state}`}>{LABELS[state]}</span>;
}
